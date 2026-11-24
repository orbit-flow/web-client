import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { getErrorMessage } from '../../api/axios';
import { getChatroomMembers, leaveChatroom } from '../../api/chat';
import { toggleBlock } from '../../api/follow';
import { getUserProfile } from '../../api/user';
import { MOBILE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useRealtime } from '../../hooks/useRealtime';
import { ChatRoomEmpty, ChatRoomItem } from '../chat/ChatRoomItem';
import { ChatRoomInfoModal, ChatRoomRenameDialog } from '../chat/ChatRoomView';
import { ChatThread } from '../chat/ChatThread';
import { ReportModal } from '../social/ReportModal';
import { AvatarSlot } from '../ui/AvatarSlot';
import { GlyphButton } from '../ui/GlyphButton';
import { Menu } from '../ui/Menu';
import { chatroomTitle } from '../../utils/chat';
import { showErrorToast } from '../../utils/errorToast';
import plusIcon from '../../assets/icons/plus.svg';

const MAX_AVATARS = 3;

// 팀 채팅방 탭: 왼쪽 방 목록 + 오른쪽 대화(실시간). rooms는 이 팀의 방만
// 고른 방이 없으면 데스크톱은 첫 방을 열고, 모바일은 목록만 보여 준다(고르면 대화가 화면을 채운다)
export function TeamChatPanel({ rooms, selectedUuid, onSelect, onCreate }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const room = rooms.find((item) => item.uuid === selectedUuid) ?? (isMobile ? null : rooms[0]) ?? null;

  return (
    <div className={classNames('team-chat', { 'team-chat--open': room })}>
      <aside className="team-chat__rooms" aria-label="채팅방 목록">
        <div className="team-chat__rooms-head">
          <h2 className="team-chat__rooms-title">채팅방</h2>
          <GlyphButton icon={plusIcon} label="채팅방 만들기" size={18} onClick={onCreate} />
        </div>
        {/* 방이 없으면 데스크톱은 오른쪽 대화 자리, 모바일은 목록 자리에 안내 */}
        {rooms.length === 0 && isMobile && <ChatRoomEmpty hasRooms={false} />}
        <div className="team-chat__list">
          {rooms.map((item) => (
            <ChatRoomItem
              key={item.uuid}
              room={item}
              title={chatroomTitle(item)}
              meta={item.memberCount}
              selected={item.uuid === room?.uuid}
              onClick={() => onSelect(item.uuid)}
            />
          ))}
        </div>
      </aside>
      {room ? (
        <TeamChatroom key={room.uuid} room={room} />
      ) : (
        <div className="team-chat__placeholder">
          <ChatRoomEmpty hasRooms={rooms.length > 0} />
        </div>
      )}
    </div>
  );
}

// 고른 방: 머리(이름·참여자 사진·메뉴) + 대화
// ⋯ : 채팅방 정보 · 참여자 보기(참여자마다 신고 · 차단) · 1:1이면 상대 차단 · 신고 · 나가기
function TeamChatroom({ room }) {
  const { reloadRooms } = useRealtime();
  const [members, setMembers] = useState([]);
  const [panel, setPanel] = useState(null); // 'info' | 'members' | 'rename' | 'report'
  const [counterpart, setCounterpart] = useState(null); // 1:1 상대의 차단 여부(blockedByMe)
  const direct = room.type === 'DIRECT';

  useEffect(() => {
    // 방이 바뀌면 key로 새로 그려지므로 1:1이 아닐 때는 비워 둔 채 그대로
    if (!direct || !room.counterpartUuid) return undefined;
    let ignore = false;
    getUserProfile(room.counterpartUuid)
      .then((profile) => !ignore && setCounterpart(profile))
      .catch(() => !ignore && setCounterpart(null));
    return () => {
      ignore = true;
    };
  }, [direct, room.counterpartUuid]);

  const blockCounterpart = () =>
    toggleBlock(counterpart.uuid)
      .then(() => setCounterpart((prev) => ({ ...prev, blockedByMe: !prev.blockedByMe })))
      .catch((err) => showErrorToast(getErrorMessage(err, '차단을 바꾸지 못했어요.')));

  useEffect(() => {
    let ignore = false;
    getChatroomMembers(room.uuid)
      .then((page) => !ignore && setMembers(page.content))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [room.uuid, room.memberCount]);

  const title = chatroomTitle(room);

  return (
    <section className="team-chat__view" aria-label={title}>
      <header className="team-chat__head">
        <div className="team-chat__head-text">
          <h3 className="team-chat__title">{title}</h3>
          <span className="team-chat__subtitle">참여자 {room.memberCount}명</span>
        </div>
        <div className="team-chat__avatars" aria-hidden="true">
          {members.slice(0, MAX_AVATARS).map((member) => (
            <AvatarSlot key={member.uuid} src={member.profileImage} size="xs" />
          ))}
          {members.length > MAX_AVATARS && <span className="team-chat__avatar-more num">+{members.length - MAX_AVATARS}</span>}
        </div>
        <Menu
          label="채팅방 메뉴"
          items={[
            { label: '채팅방 정보', onClick: () => setPanel('info') },
            { label: '참여자 보기', onClick: () => setPanel('members') },
            { label: '이름 바꾸기', onClick: () => setPanel('rename') },
            direct && counterpart && { label: counterpart.blockedByMe ? '차단 해제' : '차단', onClick: blockCounterpart },
            direct && counterpart && { label: '사용자 신고', onClick: () => setPanel('report') },
            {
              label: '채팅방 나가기',
              danger: true,
              onClick: () => leaveChatroom(room.uuid).then(reloadRooms, (err) => showErrorToast(getErrorMessage(err, '나가지 못했어요.'))),
            },
          ]}
        />
      </header>
      <ChatThread room={room} />

      {(panel === 'info' || panel === 'members') && (
        <ChatRoomInfoModal room={room} title={title} mode={panel} inTeam onClose={() => setPanel(null)} />
      )}
      {panel === 'rename' && <ChatRoomRenameDialog room={room} title={title} onClose={() => setPanel(null)} />}
      {panel === 'report' && counterpart && (
        <ReportModal
          target={{
            contentType: 'USER',
            targetUserUuid: counterpart.uuid,
            description: `${title}님을 신고해요`,
            blockUuid: counterpart.blockedByMe ? undefined : counterpart.uuid,
          }}
          onClose={() => setPanel(null)}
          onBlocked={() => setCounterpart((prev) => ({ ...prev, blockedByMe: true }))}
        />
      )}
    </section>
  );
}
