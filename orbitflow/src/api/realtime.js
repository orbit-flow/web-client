import { Client } from '@stomp/stompjs';
import { reissueToken } from './axios';
import { getAccessToken, TOKEN_CHANGED_EVENT } from './token';

// ───────── 채팅: STOMP over WebSocket(/ws, SockJS 없음) ─────────
// 받기 전용. 방마다 /sub/chatrooms/{uuid}를 구독하고 ChatEvent { type: MESSAGE | UNSENT, message }를 넘긴다

const RECONNECT_DELAY = 3000;
// 토큰이 만료되면 서버가 구독을 조용히 끊으므로 만료 30초 전에 미리 재발급한다
const REFRESH_BEFORE_MS = 30_000;

let client = null;
let refreshTimer = null;
const handlers = new Map(); // chatroomUuid → Set<handler>
const subscriptions = new Map(); // chatroomUuid → StompSubscription

const socketUrl = () => `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

// JWT exp(초)를 읽는다. 못 읽으면 null
function tokenExpiresAt(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  const expiresAt = tokenExpiresAt(getAccessToken() ?? '');
  if (!expiresAt) return;
  refreshTimer = setTimeout(() => reissueToken().catch(() => {}), Math.max(0, expiresAt - Date.now() - REFRESH_BEFORE_MS));
}

function subscribeRoom(chatroomUuid) {
  if (!client?.connected || subscriptions.has(chatroomUuid)) return;
  const subscription = client.subscribe(`/sub/chatrooms/${chatroomUuid}`, (frame) => {
    const event = JSON.parse(frame.body);
    handlers.get(chatroomUuid)?.forEach((handler) => handler(event));
  });
  subscriptions.set(chatroomUuid, subscription);
}

// 새 토큰이면 소켓을 끊어 새 CONNECT 헤더로 다시 붙게 한다(구독은 onConnect에서 다시 건다)
function handleTokenChanged() {
  if (!client) return;
  if (!getAccessToken()) {
    disconnectChat();
    return;
  }
  scheduleRefresh();
  client.forceDisconnect();
}

function ensureClient() {
  if (client) return;
  client = new Client({
    brokerURL: socketUrl(),
    reconnectDelay: RECONNECT_DELAY,
    beforeConnect: (self) => {
      self.connectHeaders = { Authorization: `Bearer ${getAccessToken()}` };
    },
    onConnect: () => {
      subscriptions.clear();
      scheduleRefresh();
      for (const chatroomUuid of handlers.keys()) subscribeRoom(chatroomUuid);
    },
    // CONNECT 거부(만료 토큰 등)면 재발급해 두고 다음 재연결을 기다린다
    onStompError: () => {
      reissueToken().catch(() => {});
    },
    onWebSocketClose: () => subscriptions.clear(),
  });
  window.addEventListener(TOKEN_CHANGED_EVENT, handleTokenChanged);
  client.activate();
}

// 방 구독. 같은 방을 여러 곳에서 구독해도 소켓 구독은 하나. 돌려준 함수로 해제
export function subscribeChatroom(chatroomUuid, handler) {
  if (!handlers.has(chatroomUuid)) handlers.set(chatroomUuid, new Set());
  handlers.get(chatroomUuid).add(handler);
  ensureClient();
  subscribeRoom(chatroomUuid);

  return () => {
    const set = handlers.get(chatroomUuid);
    set?.delete(handler);
    if (set && set.size === 0) {
      handlers.delete(chatroomUuid);
      if (client?.connected) subscriptions.get(chatroomUuid)?.unsubscribe();
      subscriptions.delete(chatroomUuid);
    }
  };
}

export function disconnectChat() {
  clearTimeout(refreshTimer);
  window.removeEventListener(TOKEN_CHANGED_EVENT, handleTokenChanged);
  client?.deactivate();
  client = null;
  handlers.clear();
  subscriptions.clear();
}

// ───────── 알림: SSE(GET /api/notifications/subscribe) ─────────
// Authorization 헤더가 필요해 EventSource 대신 fetch 스트림으로 읽는다.
// 서버가 30분마다 끊으므로 다시 붙고, 붙을 때마다 onOpen(놓친 알림은 목록 API로 보충)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// "event: 이름\ndata: 값\n\n" 묶음을 하나씩 넘긴다. ":ping" 같은 주석 줄은 건너뛴다
async function readEvents(body, onEvent) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value.replace(/\r\n/g, '\n');
    let end = buffer.indexOf('\n\n');
    while (end !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let name = 'message';
      const data = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) name = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (data.length) onEvent(name, data.join('\n'));
      end = buffer.indexOf('\n\n');
    }
  }
}

export function subscribeNotifications({ onNotification, onOpen }) {
  let stopped = false;
  let controller = null;

  const loop = async () => {
    while (!stopped) {
      controller = new AbortController();
      try {
        const response = await fetch('/api/notifications/subscribe', {
          headers: { Accept: 'text/event-stream', Authorization: `Bearer ${getAccessToken()}` },
          credentials: 'include',
          signal: controller.signal,
        });
        if (response.status === 401) {
          await reissueToken();
          continue;
        }
        if (!response.ok || !response.body) throw new Error(`SSE ${response.status}`);
        await readEvents(response.body, (name, data) => {
          if (name === 'connect') onOpen?.();
          else if (name === 'notification') onNotification(JSON.parse(data));
        });
      } catch {
        // 끊기거나 재발급이 실패하면 잠시 뒤 다시 시도한다(로그아웃되면 멈춘다)
        if (stopped || !getAccessToken()) return;
      }
      if (!stopped) await sleep(RECONNECT_DELAY);
    }
  };
  loop();

  return () => {
    stopped = true;
    controller?.abort();
  };
}
