import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { getErrorMessage } from '../../api/axios';
import { deleteMessage, getMessages, markChatroomRead, sendMessage } from '../../api/chat';
import { subscribeChatroom } from '../../api/realtime';
import { useRealtime } from '../../hooks/useRealtime';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Button } from '../ui/Button';
import { GlyphButton } from '../ui/GlyphButton';
import { Input } from '../ui/Input';
import { applyChatEvent, chatroomTitle, dayLabel } from '../../utils/chat';
import { formatTime, isSameDay, parseLocal, toLocalDateTime } from '../../utils/date';
import { showErrorToast } from '../../utils/errorToast';
import arrowIcon from '../../assets/icons/back.svg';

const PAGE_SIZE = 30;
const READ_DELAY = 800;
const LONG_PRESS = 500;

// 대화 본문 + 입력칸. 열면 최근 30개를 받고, 위로 "이전 메시지"를 더 받는다
// 새 메시지는 STOMP로 받고, 보낼 때는 "보내는 중"으로 먼저 그린 뒤 실패하면 같은 clientMessageId로 다시 보낸다
// selfLabel: 내 메시지 이름 자리(없으면 내 닉네임)
// bubble: 개인 채팅은 말풍선(내 말 오른쪽 · 상대 왼쪽, 같은 사람이 이어 말하면 사진·이름 생략). 없으면 팀 채팅의 줄 목록
export function ChatThread({ room, selfLabel, bubble = false }) {
  const { myUuid, setOpenRoom } = useRealtime();
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null); // { beforeId, page, hasMore }
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const stickToBottom = useRef(true);
  const readTimer = useRef(null);
  const [actionId, setActionId] = useState(null); // 전송 취소를 띄운 내 메시지
  const pressTimer = useRef(null);
  const touchPress = useRef(false);

  // 띄운 전송 취소는 다른 곳(내 메시지 본문 · 전송 취소 버튼 밖)을 누르거나 Esc로 닫는다
  useEffect(() => {
    if (actionId == null) return undefined;
    const close = (event) => !event.target.closest('[data-message-actions]') && setActionId(null);
    const escape = (event) => event.key === 'Escape' && setActionId(null);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [actionId]);

  useEffect(() => () => clearTimeout(pressTimer.current), []);

  // 열 때: 최근 메시지 + 읽음 처리 + 구독
  useEffect(() => {
    if (!myUuid) return undefined;
    let ignore = false;
    setOpenRoom(room.uuid);
    getMessages(room.uuid, { size: PAGE_SIZE })
      .then((page) => {
        if (ignore) return;
        const loaded = [...page.content].reverse();
        setMessages((prev) => [...loaded, ...prev.filter((item) => !loaded.some((old) => old.id === item.id))]);
        // 첫 결과의 최신 id + 1로 커서를 고정하면 그 사이 새 메시지가 와도 페이지가 밀리지 않는다
        setCursor({ beforeId: (page.content[0]?.id ?? 0) + 1, page: 1, hasMore: page.totalPages > 1 });
      })
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '메시지를 불러오지 못했어요.')));
    markChatroomRead(room.uuid).catch(() => {});

    const off = subscribeChatroom(room.uuid, (event) => {
      setMessages((prev) => applyChatEvent(prev, event));
      if (event.type === 'MESSAGE' && event.message.sender.uuid !== myUuid) {
        clearTimeout(readTimer.current);
        readTimer.current = setTimeout(() => markChatroomRead(room.uuid).catch(() => {}), READ_DELAY);
      }
    });
    return () => {
      ignore = true;
      off();
      clearTimeout(readTimer.current);
      setOpenRoom(null);
    };
  }, [room.uuid, myUuid, setOpenRoom]);

  // 맨 아래를 보고 있을 때만 새 메시지를 따라 내려간다
  useEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const loadOlder = async () => {
    const nextPage = cursor.page + 1;
    try {
      const page = await getMessages(room.uuid, { beforeId: cursor.beforeId, page: nextPage, size: PAGE_SIZE });
      stickToBottom.current = false;
      setMessages((prev) => [...[...page.content].reverse(), ...prev]);
      setCursor({ ...cursor, page: nextPage, hasMore: page.totalPages > nextPage });
    } catch (err) {
      showErrorToast(getErrorMessage(err, '이전 메시지를 불러오지 못했어요.'));
    }
  };

  const deliver = async (pending) => {
    setMessages((prev) => prev.map((item) => (item.clientMessageId === pending.clientMessageId ? { ...item, failed: false } : item)));
    try {
      const sent = await sendMessage(room.uuid, pending.content, pending.clientMessageId);
      setMessages((prev) => applyChatEvent(prev, { type: 'MESSAGE', message: sent }));
    } catch (err) {
      showErrorToast(getErrorMessage(err, '메시지를 보내지 못했어요.'));
      setMessages((prev) => prev.map((item) => (item.clientMessageId === pending.clientMessageId ? { ...item, failed: true } : item)));
    }
  };

  const handleSend = (event) => {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    const clientMessageId = crypto.randomUUID();
    const pending = {
      id: `pending-${clientMessageId}`,
      clientMessageId,
      type: 'TEXT',
      content,
      pending: true,
      sender: { uuid: myUuid, nickname: selfLabel ?? '나' },
      createdAt: toLocalDateTime(new Date()),
    };
    stickToBottom.current = true;
    setMessages((prev) => [...prev, pending]);
    setText('');
    deliver(pending);
  };

  // 내 메시지 본문: PC는 클릭, 터치는 꾹 누르면(0.5초) 전송 취소를 띄운다. 키보드는 Enter · Space
  // 터치로 누른 뒤 따라오는 click은 무시하고, 누르다 스크롤하면(pointercancel) 취소된다
  const toggleActions = (id) => setActionId((prev) => (prev === id ? null : id));
  const cancelPress = () => clearTimeout(pressTimer.current);
  const actionProps = (message) => ({
    role: 'button',
    tabIndex: 0,
    'data-message-actions': true,
    'aria-expanded': actionId === message.id,
    'aria-haspopup': 'true',
    onPointerDown: (event) => {
      touchPress.current = event.pointerType === 'touch';
      if (!touchPress.current) return;
      cancelPress();
      pressTimer.current = setTimeout(() => setActionId(message.id), LONG_PRESS);
    },
    onPointerUp: cancelPress,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
    onContextMenu: (event) => touchPress.current && event.preventDefault(),
    onClick: () => !touchPress.current && toggleActions(message.id),
    onKeyDown: (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleActions(message.id);
    },
  });
  const canUnsend = (message, mine) => mine && !message.pending && !message.unsent && !message.failed;
  const unsendButton = (message) =>
    actionId === message.id && (
      <button
        type="button"
        className="chat-message__unsend"
        data-message-actions
        onClick={() => {
          setActionId(null);
          unsend(message);
        }}
      >
        전송 취소
      </button>
    );

  const unsend = (message) =>
    deleteMessage(message.id, 'ALL')
      .then(() => setMessages((prev) => applyChatEvent(prev, { type: 'UNSENT', message: { ...message, unsent: true, content: undefined } })))
      .catch((err) => showErrorToast(getErrorMessage(err, '전송을 취소하지 못했어요.')));

  const title = chatroomTitle(room);
  // 1:1은 서버가 퇴장 안내를 남기지 않는다. 상대가 나가면 방 정보에서 상대(counterpart)가 빠지므로 그걸로 알린다
  const counterpartLeft = room.type === 'DIRECT' && !room.counterpartUuid && messages.length > 0;
  const leftName = counterpartLeft ? [...messages].reverse().find((item) => item.sender.uuid !== myUuid)?.sender.nickname : null;

  return (
    <>
      <div
        className={classNames('chat-thread__messages', { 'chat-thread__messages--bubble': bubble })}
        ref={listRef}
        onScroll={(event) => {
          const list = event.currentTarget;
          stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
        }}
      >
        {cursor?.hasMore && (
          <Button variant="ghost" dense className="chat-thread__older" onClick={loadOlder}>
            이전 메시지 더 보기
          </Button>
        )}
        {cursor && messages.length === 0 && <p className="page__empty">첫 메시지를 보내 보세요</p>}
        {messages.map((message, index) => {
          const date = parseLocal(message.createdAt);
          const prev = messages[index - 1];
          const newDay = !prev || !isSameDay(parseLocal(prev.createdAt), date);
          const mine = message.sender.uuid === myUuid;
          const muted = message.unsent || message.blockedSender;
          const content = message.unsent ? '전송 취소된 메시지예요' : message.blockedSender ? '차단한 사용자의 메시지예요' : message.content;
          const failed = message.failed && (
            <span className="chat-message__failed">
              보내지 못했어요 ·{' '}
              <button type="button" className="chat-message__action" onClick={() => deliver(message)}>
                다시 보내기
              </button>
            </span>
          );
          // 같은 날 같은 사람이 이어 보낸 말풍선은 사진·이름 없이 붙인다
          const grouped = bubble && !newDay && prev?.type === 'TEXT' && prev.sender.uuid === message.sender.uuid;
          // 팀 채팅(줄 목록): 같은 사람이 같은 분에 이어 보낸 메시지는 사진 · 이름 · 시간 없이 첫 메시지 아래에 붙인다
          const lineGrouped =
            !bubble &&
            !newDay &&
            prev?.type === 'TEXT' &&
            prev.sender.uuid === message.sender.uuid &&
            Math.floor(parseLocal(prev.createdAt).getTime() / 60000) === Math.floor(date.getTime() / 60000);
          // 같은 사람이 같은 분에 이어 보낸 말풍선은 그 분의 마지막 말풍선에만 시간을 붙인다(보내는 중 · 실패는 늘 표시)
          const next = messages[index + 1];
          const sameMinuteNext =
            next?.type === 'TEXT' &&
            next.sender.uuid === message.sender.uuid &&
            Math.floor(parseLocal(next.createdAt).getTime() / 60000) === Math.floor(date.getTime() / 60000);
          const showTime = message.pending || message.failed || !sameMinuteNext;
          return (
            <div key={message.id}>
              {newDay && <div className="chat-thread__day">{dayLabel(date)}</div>}
              {message.type === 'TEXT' && bubble ? (
                <div
                  className={classNames('chat-bubble', {
                    'chat-bubble--mine': mine,
                    'chat-bubble--grouped': grouped,
                    'chat-bubble--pending': message.pending && !message.failed,
                  })}
                >
                  {!mine && (grouped ? <span className="chat-bubble__avatar-space" /> : <AvatarSlot src={message.sender.profileImage} size="sm" />)}
                  <div className="chat-bubble__body">
                    {!mine && !grouped && <span className="chat-bubble__name">{message.sender.nickname}</span>}
                    <div className="chat-bubble__row">
                      <p
                        className={classNames('chat-bubble__content', {
                          'chat-bubble__content--muted': muted,
                          'chat-message__pressable': canUnsend(message, mine),
                        })}
                        {...(canUnsend(message, mine) ? actionProps(message) : {})}
                      >
                        {content}
                      </p>
                      {showTime && <span className="chat-bubble__time num">{message.pending ? '보내는 중' : formatTime(date)}</span>}
                    </div>
                    {unsendButton(message)}
                    {failed}
                  </div>
                </div>
              ) : message.type === 'TEXT' ? (
                <div
                  className={classNames('chat-message', {
                    'chat-message--grouped': lineGrouped,
                    'chat-message--pending': message.pending && !message.failed,
                  })}
                >
                  {lineGrouped ? <span className="chat-message__avatar-space" /> : <AvatarSlot src={message.sender.profileImage} size="sm" />}
                  <div className="chat-message__body">
                    {!lineGrouped && (
                      <span className="chat-message__meta">
                        <span className={classNames('chat-message__name', { 'chat-message__name--me': mine })}>
                          {mine && selfLabel ? selfLabel : message.sender.nickname}
                        </span>
                        <span className="chat-message__time num">{message.pending ? '보내는 중' : formatTime(date)}</span>
                      </span>
                    )}
                    <p
                      className={classNames('chat-message__content', {
                        'chat-message__content--muted': muted,
                        'chat-message__pressable': canUnsend(message, mine),
                      })}
                      {...(canUnsend(message, mine) ? actionProps(message) : {})}
                    >
                      {content}
                    </p>
                    {unsendButton(message)}
                    {failed}
                  </div>
                </div>
              ) : (
                <p className="chat-thread__notice">
                  {message.sender.nickname}님이 {message.type === 'JOIN' ? '들어오셨어요' : '나가셨어요'}
                </p>
              )}
            </div>
          );
        })}
        {counterpartLeft && (
          <p className="chat-thread__notice">
            {leftName ? `${leftName}님이` : '상대가'} 대화방을 나가셨어요 · 메시지를 보내면 다시 대화에 들어와요
          </p>
        )}
      </div>

      <form className="chat-thread__composer" onSubmit={handleSend}>
        <Input
          aria-label="메시지"
          className="chat-thread__input"
          placeholder={room.type === 'DIRECT' ? '메시지 보내기' : `${title}에 메시지 보내기`}
          value={text}
          maxLength={2000}
          onChange={(event) => setText(event.target.value)}
        />
        <GlyphButton type="submit" icon={arrowIcon} size={40} label="보내기" className="send-button" disabled={!text.trim()} />
      </form>
    </>
  );
}
