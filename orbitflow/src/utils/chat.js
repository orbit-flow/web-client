import { addDays, formatShortDate, formatTime, isSameDay, parseLocal, weekdayName } from './date';

// 서버가 보는 사람 기준으로 정한 이름(내가 붙인 이름 → 만든 사람이 정한 이름 → 참여자 이름), 1:1은 없으면 상대 이름(상대가 나갔으면 이름이 오지 않음)
export const chatroomTitle = (room) =>
  room.title ?? room.counterpartNickname ?? (room.type === 'DIRECT' ? '나간 사용자' : '이름 없는 대화');

// 목록 시각: 오늘이면 "13:02", 어제면 "어제", 그 전은 "10.12"
export function listTime(value) {
  if (!value) return '';
  const date = parseLocal(value);
  const today = new Date();
  if (isSameDay(date, today)) return formatTime(date);
  if (isSameDay(date, addDays(today, -1))) return '어제';
  return formatShortDate(date);
}

export const dayLabel = (date) => `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekdayName(date)}요일`;

export function messagePreview(message) {
  if (!message) return '아직 메시지가 없어요';
  if (message.unsent) return '전송 취소된 메시지예요';
  if (message.blockedSender) return '차단한 사용자의 메시지예요';
  return message.content;
}

// 목록 정렬: 마지막 메시지 최신순, 메시지 없는 방은 뒤로
export const sortRooms = (rooms) =>
  [...rooms].sort((a, b) => (b.lastMessage?.id ?? -1) - (a.lastMessage?.id ?? -1));

// 실시간 이벤트를 메시지 목록에 반영한다. 보낸 본인에게도 오므로 id·clientMessageId로 중복을 거른다
export function applyChatEvent(messages, { type, message }) {
  if (type === 'UNSENT') return messages.map((item) => (item.id === message.id ? { ...item, ...message } : item));
  const index = messages.findIndex(
    (item) => item.id === message.id || (message.clientMessageId && item.clientMessageId === message.clientMessageId),
  );
  if (index === -1) return [...messages, message];
  return messages.map((item, i) => (i === index ? message : item));
}
