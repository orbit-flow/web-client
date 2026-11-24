import classNames from 'classnames';
import { Badge } from '../ui/Badge';
import { EmptyHint } from '../ui/Icon';
import { listTime, messagePreview } from '../../utils/chat';
import chatIcon from '../../assets/icons/chat.svg';

// 열린 방이 없을 때 대화 자리(개인 · 팀 채팅 공통): 가운데 파란 채팅 아이콘 + 안내.
// 줄 있는 채팅 아이콘은 여기에만 쓰고, 버튼·바로가기에는 빈 말풍선(message.svg)을 쓴다
export function ChatRoomEmpty({ hasRooms }) {
  return <EmptyHint icon={chatIcon} title={hasRooms ? '채팅방을 선택해 주세요' : '채팅방이 없어요'} />;
}

// 채팅방 목록 한 칸: 이름 · 종류(1:1 / 팀 · n명 …) · 시각 + 마지막 메시지 · 안 읽은 수(알림 끈 방은 회색)
export function ChatRoomItem({ room, title, meta, selected = false, onClick }) {
  return (
    <button type="button" className={classNames('chat-room-item', { 'chat-room-item--selected': selected })} onClick={onClick}>
      <span className="chat-room-item__top">
        <span className="chat-room-item__title">{title}</span>
        <span className="chat-room-item__meta num">{meta}</span>
        <span className="chat-room-item__meta num">{listTime(room.lastMessage?.createdAt)}</span>
      </span>
      <span className="chat-room-item__bottom">
        <span className="chat-room-item__preview">{messagePreview(room.lastMessage)}</span>
        {room.unreadCount > 0 && (
          <Badge tone={room.muted ? 'neutral' : 'danger'} solid={!room.muted}>
            {room.unreadCount > 99 ? '99+' : room.unreadCount}
          </Badge>
        )}
      </span>
    </button>
  );
}
