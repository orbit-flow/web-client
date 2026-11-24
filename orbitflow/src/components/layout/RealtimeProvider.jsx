import classNames from 'classnames';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyUuid } from '../../api/avatar';
import { getChatrooms } from '../../api/chat';
import { getUnreadNotificationCount, readNotification } from '../../api/notification';
import { disconnectChat, subscribeChatroom, subscribeNotifications } from '../../api/realtime';
import { RealtimeContext } from '../../hooks/useRealtime';
import { chatroomTitle, messagePreview, sortRooms } from '../../utils/chat';
import { isPostNotification, notificationPath } from '../../utils/notification';

const TOAST_MS = 5000;
// 사라지는 애니메이션 길이(css .toast--leaving의 --dur-base와 같게)
const TOAST_LEAVE_MS = 200;
const MAX_TOASTS = 3;

// 로그인 후 화면 전체에서 실시간 상태를 나눠 쓴다
// - 채팅: 내 모든 방을 구독해 마지막 메시지·안 읽은 수를 갱신(지금 열어 둔 방은 안 읽은 수를 올리지 않음)
// - 알림: SSE로 새 알림을 받아 안 읽은 수를 올리고 onNotification 구독자에게 넘긴다
// - 새 알림·새 메시지(지금 열지 않은, 알림 켠 방)는 오른쪽 아래 토스트로 잠깐 보여 준다. 누르면 그곳으로
export function RealtimeProvider({ children }) {
  const navigate = useNavigate();
  // navigate는 화면을 옮길 때마다 바뀌어서, 구독 effect가 다시 돌지 않게 ref로 쓴다
  const navigateRef = useRef(navigate);
  const [myUuid, setMyUuid] = useState(null);
  const [toasts, setToasts] = useState([]);
  const roomsRef = useRef([]);
  const toastIdRef = useRef(0);
  const [rooms, setRooms] = useState([]);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const myUuidRef = useRef(null);
  const openRoomRef = useRef(null);
  const listenersRef = useRef(new Set());

  // 닫을 때는 바로 지우지 않고 leaving으로 표시해 사라지는 애니메이션(.toast--leaving)을 보여 준 뒤 지운다
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), TOAST_LEAVE_MS);
  }, []);

  // toast: { title, body, onOpen? } — 5초 뒤 사라지고, 한 번에 3개까지
  const showToast = useCallback(
    (toast) => {
      toastIdRef.current += 1;
      const id = toastIdRef.current;
      setToasts((prev) => [...prev, { ...toast, id }].slice(-MAX_TOASTS));
      setTimeout(() => dismissToast(id), TOAST_MS);
    },
    [dismissToast],
  );

  const reloadRooms = useCallback(
    () =>
      getChatrooms()
        .then((page) => setRooms(sortRooms(page.content)))
        .catch(() => {}),
    [],
  );

  const refreshNotificationUnread = useCallback(
    () =>
      getUnreadNotificationCount()
        .then((count) => setNotificationUnread(count))
        .catch(() => {}),
    [],
  );

  useEffect(() => {
    const loadMe = () =>
      getMyUuid()
        .then((uuid) => {
          myUuidRef.current = uuid;
          setMyUuid(uuid);
        })
        .catch(() => {});
    loadMe();
    reloadRooms();
    refreshNotificationUnread();
    // 다른 사람이 만든 새 방은 이벤트가 없어 창으로 돌아올 때 목록을 다시 받는다(처음에 내 uuid를 못 받았으면 그것도)
    const handleFocus = () => {
      if (!myUuidRef.current) loadMe();
      reloadRooms();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      disconnectChat();
    };
  }, [reloadRooms, refreshNotificationUnread]);

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // 방 목록이 바뀔 때만 구독을 다시 건다
  const roomKey = rooms.map((room) => room.uuid).join(',');
  useEffect(() => {
    if (!roomKey) return undefined;
    const offs = roomKey.split(',').map((uuid) =>
      subscribeChatroom(uuid, ({ type, message }) => {
        setRooms((prev) =>
          sortRooms(
            prev.map((room) => {
              if (room.uuid !== uuid) return room;
              if (type === 'UNSENT') {
                return room.lastMessage?.id === message.id ? { ...room, lastMessage: message } : room;
              }
              // 입장·퇴장 안내는 마지막 메시지로 치지 않고 참여자 수만 바꾼다
              if (message.type === 'JOIN') return { ...room, memberCount: (room.memberCount ?? 0) + 1 };
              if (message.type === 'LEAVE') return { ...room, memberCount: Math.max(0, (room.memberCount ?? 0) - 1) };
              if (message.type !== 'TEXT') return room;
              const fromOther = message.sender.uuid !== myUuidRef.current;
              const unread = fromOther && openRoomRef.current !== uuid ? (room.unreadCount ?? 0) + 1 : room.unreadCount;
              return { ...room, lastMessage: message, unreadCount: unread };
            }),
          ),
        );
        const room = roomsRef.current.find((item) => item.uuid === uuid);
        const fromOther = message.sender.uuid !== myUuidRef.current;
        if (type === 'MESSAGE' && message.type === 'TEXT' && fromOther && openRoomRef.current !== uuid && room && !room.muted) {
          showToast({
            title: chatroomTitle(room),
            // 1:1은 제목이 곧 상대 이름이라 보낸 사람을 다시 붙이지 않는다
            body: room.type === 'DIRECT' ? messagePreview(message) : `${message.sender.nickname}: ${messagePreview(message)}`,
            onOpen: () => navigateRef.current(room.teamUuid ? `/teams/${room.teamUuid}?tab=chatrooms&room=${uuid}` : `/chats?room=${uuid}`),
          });
        }
      }),
    );
    return () => offs.forEach((off) => off());
  }, [roomKey, showToast]);

  useEffect(
    () =>
      subscribeNotifications({
        onOpen: refreshNotificationUnread,
        onNotification: (notification) => {
          setNotificationUnread((count) => count + 1);
          listenersRef.current.forEach((listener) => listener(notification));
          showToast({
            title: '새 알림',
            body: notification.content,
            onOpen: () => {
              readNotification(notification.id)
                .then(() => setNotificationUnread((count) => Math.max(0, count - 1)))
                .catch(() => {});
              navigateRef.current(isPostNotification(notification) ? `/notifications?post=${notification.targetId}` : notificationPath(notification));
            },
          });
        },
      }),
    [refreshNotificationUnread, showToast],
  );

  const updateRoom = useCallback(
    (uuid, patch) => setRooms((prev) => prev.map((room) => (room.uuid === uuid ? { ...room, ...patch } : room))),
    [],
  );

  // 대화를 열면 그 방은 읽은 것으로 보고, 닫을 때 null
  const setOpenRoom = useCallback(
    (uuid) => {
      openRoomRef.current = uuid;
      if (uuid) updateRoom(uuid, { unreadCount: 0 });
    },
    [updateRoom],
  );

  // 새 알림 구독. 돌려준 함수로 해제
  const onNotification = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const value = useMemo(
    () => ({
      myUuid,
      rooms,
      reloadRooms,
      updateRoom,
      setOpenRoom,
      // 사이드바 "채팅" 배지는 개인 대화만(팀 방은 팀 화면에서)
      chatUnread: rooms.reduce((sum, room) => sum + (room.muted || room.teamUuid ? 0 : room.unreadCount ?? 0), 0),
      notificationUnread,
      setNotificationUnread,
      refreshNotificationUnread,
      onNotification,
      showToast,
    }),
    [myUuid, rooms, reloadRooms, updateRoom, setOpenRoom, notificationUnread, refreshNotificationUnread, onNotification, showToast],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-stack" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={classNames('toast', { 'toast--leaving': toast.leaving })}>
              <button
                type="button"
                className="toast__main"
                onClick={() => {
                  dismissToast(toast.id);
                  toast.onOpen?.();
                }}
              >
                <span className="toast__title">{toast.title}</span>
                {toast.body && <span className="toast__body">{toast.body}</span>}
              </button>
              <button type="button" className="toast__close" aria-label="닫기" onClick={() => dismissToast(toast.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </RealtimeContext.Provider>
  );
}
