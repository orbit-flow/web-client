import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../api/axios';
import { getChatroomMembers, leaveChatroom, setChatroomMuted, setChatroomTitle } from '../../api/chat';
import { getBlocks, toggleBlock } from '../../api/follow';
import { getUserProfile } from '../../api/user';
import { useRealtime } from '../../hooks/useRealtime';
import { ReportModal } from '../social/ReportModal';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { GlyphButton } from '../ui/GlyphButton';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { Menu } from '../ui/Menu';
import { Modal } from '../ui/Modal';
import { ChatThread } from './ChatThread';
import { formatYearMonth, parseLocal } from '../../utils/date';
import { showErrorToast } from '../../utils/errorToast';
import backIcon from '../../assets/icons/back.svg';
import closeIcon from '../../assets/icons/close.svg';
import teamIcon from '../../assets/icons/team.svg';

const FOLLOW_LABEL = { ACCEPTED: '팔로잉', PENDING: '팔로우 요청함' };

const formatJoinDate = (value) => {
  const date = parseLocal(value);
  return `${formatYearMonth(date)} ${date.getDate()}일`;
};

// 채팅방 정보(mode 'info': 내가 들어온 날 · 참여자 수 + 참여자) · 참여자 보기(mode 'members': 참여자만). 참여자는 최근 참여 순
// 개인 채팅은 참여자를 누르면 그 사람 프로필, 팀 채팅(inTeam)은 개인 프로필로 보내지 않고 참여자마다 ⋯(신고 · 차단)
export function ChatRoomInfoModal({ room, title, mode = 'info', inTeam = false, onClose }) {
  const navigate = useNavigate();
  const { myUuid } = useRealtime();
  const [members, setMembers] = useState(null);
  const [blocked, setBlocked] = useState(() => new Set());
  const [report, setReport] = useState(null); // 신고할 참여자

  useEffect(() => {
    let ignore = false;
    getChatroomMembers(room.uuid)
      .then((page) => !ignore && setMembers(page.content))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '참여자를 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [room.uuid]);

  // 차단 메뉴 글자(차단 · 차단 해제)를 정하려고 내 차단 목록을 받는다
  useEffect(() => {
    if (!inTeam) return undefined;
    let ignore = false;
    getBlocks()
      .then((page) => !ignore && setBlocked(new Set(page.content.map((person) => person.uuid))))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [inTeam]);

  const markBlocked = (uuid, value) =>
    setBlocked((prev) => {
      const next = new Set(prev);
      if (value) next.add(uuid);
      else next.delete(uuid);
      return next;
    });

  const toggleBlockOf = (member) =>
    toggleBlock(member.uuid)
      .then(() => markBlocked(member.uuid, !blocked.has(member.uuid)))
      .catch((err) => showErrorToast(getErrorMessage(err, '차단을 바꾸지 못했어요.')));

  const me = members?.find((member) => member.uuid === myUuid);
  // 나를 맨 위에
  const ordered = members ? [...(me ? [me] : []), ...members.filter((member) => member !== me)] : [];

  return (
    <>
      <Modal label={mode === 'members' ? '참여자' : '채팅방 정보'} className="modal--form chat-room-info" onClose={onClose}>
        <div className="modal__header">
          <div className="modal__title-group">
            <h2 className="modal__title">{mode === 'members' ? `참여자 ${members ? members.length : ''}` : '채팅방 정보'}</h2>
            <p className="modal__subtitle">{title}</p>
          </div>
          <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
        </div>

        {mode === 'info' && (
          <dl className="chat-room-info__facts">
            <div className="chat-room-info__fact">
              <dt>내가 들어온 날</dt>
              <dd className="num">{me ? formatJoinDate(me.joinedAt) : '–'}</dd>
            </div>
            <div className="chat-room-info__fact">
              <dt>참여자</dt>
              <dd className="num">{members ? `${members.length}명` : '–'}</dd>
            </div>
          </dl>
        )}

        {members && (
          <div className="people-list chat-room-info__list">
            {ordered.map((member) => {
              const mine = member.uuid === myUuid;
              const content = (
                <>
                  <AvatarSlot src={member.profileImage} size="sm" />
                  <span className="person-row__text">
                    <span className="person-row__name">{mine ? `${member.nickname} (나)` : member.nickname}</span>
                    <span className="person-row__subtitle num">{formatJoinDate(member.joinedAt)} 참여</span>
                  </span>
                </>
              );
              if (mine) {
                return (
                  <div key={member.uuid} className="person-row chat-room-info__row">
                    {content}
                  </div>
                );
              }
              if (inTeam) {
                const isBlocked = blocked.has(member.uuid);
                return (
                  <div key={member.uuid} className="person-row chat-room-info__row">
                    {content}
                    <Menu
                      label={`${member.nickname}님 메뉴`}
                      items={[
                        { label: '신고', onClick: () => setReport(member) },
                        { label: isBlocked ? '차단 해제' : '차단', danger: !isBlocked, onClick: () => toggleBlockOf(member) },
                      ]}
                    />
                  </div>
                );
              }
              return (
                <button
                  key={member.uuid}
                  type="button"
                  className="person-row chat-room-info__row chat-room-info__row--link"
                  title="프로필 보기"
                  onClick={() => navigate(`/users/${member.uuid}`)}
                >
                  {content}
                </button>
              );
            })}
          </div>
        )}
      </Modal>
      {report && (
        <ReportModal
          target={{
            contentType: 'USER',
            targetUserUuid: report.uuid,
            description: `${report.nickname}님을 신고해요`,
            blockUuid: blocked.has(report.uuid) ? undefined : report.uuid,
          }}
          onClose={() => setReport(null)}
          onBlocked={() => markBlocked(report.uuid, true)}
        />
      )}
    </>
  );
}

// 방 이름 바꾸기: 내 화면에서만 바뀌고 다른 참여자에게는 그대로. 비우고 저장하면 원래 이름으로
// title은 지금 보이는 이름(입력 칸 처음 값), 저장하면 방 목록의 그 방 title을 서버가 정한 이름으로 바꾼다
export function ChatRoomRenameDialog({ room, title, onClose }) {
  const { updateRoom } = useRealtime();
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await setChatroomTitle(room.uuid, value.trim());
      updateRoom(room.uuid, { title: updated.title ?? null });
      onClose();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '이름을 바꾸지 못했어요.'));
      setSaving(false);
    }
  };

  return (
    <Dialog
      busy={saving}
      title="채팅방 이름 바꾸기"
      description="나에게만 바뀌고 다른 참여자에게는 그대로예요. 비우고 저장하면 원래 이름으로 돌아가요."
      onClose={onClose}
      actions={
        <>
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" form="chat-rename-form" disabled={saving}>
            저장
          </Button>
        </>
      }
    >
      <form id="chat-rename-form" onSubmit={save}>
        <Input aria-label="채팅방 이름" value={value} onChange={(event) => setValue(event.target.value)} maxLength={100} autoFocus />
      </form>
    </Dialog>
  );
}

// 1:1이면 상대 프로필(머리의 소개·팔로우 상태, 차단 여부)
async function loadCounterpart({ type, counterpartUuid }) {
  return type === 'DIRECT' && counterpartUuid ? getUserProfile(counterpartUuid) : null;
}

// 채팅 화면의 대화 부분. title은 목록과 같은 표시 이름
// 할 수 있는 일(정보 보기·초대·알림·차단·신고·나가기)은 모두 머리의 ⋯ 메뉴에
// onBack: 모바일에서 방을 닫고 목록으로(있을 때만 머리 왼쪽에 뒤로)
export function ChatRoomView({ room, title, onBack, onInvite, onLeft }) {
  const { updateRoom, reloadRooms } = useRealtime();
  const [profile, setProfile] = useState(null);
  const [panel, setPanel] = useState(null); // 'info' | 'members' | 'rename' | 'leave' | 'report'
  const [leaving, setLeaving] = useState(false);
  const direct = room.type === 'DIRECT';

  // 새 메시지로 room 객체가 바뀔 때마다 다시 받지 않게 필요한 값만 본다
  const roomKey = { type: room.type, counterpartUuid: room.counterpartUuid };
  useEffect(() => {
    let ignore = false;
    loadCounterpart({ type: room.type, counterpartUuid: room.counterpartUuid })
      .then((loaded) => !ignore && setProfile(loaded))
      .catch(() => !ignore && setProfile(null));
    return () => {
      ignore = true;
    };
  }, [room.type, room.counterpartUuid]);

  const run = (task, fallback) =>
    task().catch((err) => {
      showErrorToast(getErrorMessage(err, fallback));
    });

  const toggleMute = () =>
    run(async () => {
      await setChatroomMuted(room.uuid, !room.muted);
      updateRoom(room.uuid, { muted: !room.muted });
    }, '알림 설정을 바꾸지 못했어요.');

  const block = () =>
    run(async () => {
      await toggleBlock(profile.uuid);
      setProfile(await loadCounterpart(roomKey));
    }, '차단을 바꾸지 못했어요.');

  // 나가는 동안 버튼을 막아 두 번 보내지 않게 한다
  const leave = async () => {
    setLeaving(true);
    await run(async () => {
      await leaveChatroom(room.uuid);
      setPanel(null);
      await reloadRooms();
      onLeft();
    }, '대화방에서 나가지 못했어요.');
    setLeaving(false);
  };

  const subtitle = direct
    ? [profile?.introduce, FOLLOW_LABEL[profile?.followState], profile?.blockedByMe && '차단함'].filter(Boolean).join(' · ')
    : `참여자 ${room.memberCount}명`;

  return (
    <>
      <section className="chat-page__conversation" aria-label={title}>
        <header className="chat-page__room-head">
          {onBack && <GlyphButton icon={backIcon} label="뒤로" size={56} onClick={onBack} />}
          {direct ? (
            <AvatarSlot src={room.counterpartProfileImage} size="sm" />
          ) : (
            <span className="chat-page__group-icon chat-page__group-icon--sm" aria-hidden="true">
              <Icon src={teamIcon} size={18} />
            </span>
          )}
          <div className="chat-page__room-text">
            <h2 className="chat-page__room-title">{title}</h2>
            {subtitle && <span className="chat-page__room-subtitle">{subtitle}</span>}
          </div>
          <Menu
            label="방 메뉴"
            items={[
              { label: '채팅방 정보', onClick: () => setPanel('info') },
              { label: '참여자 보기', onClick: () => setPanel('members') },
              { label: '이름 바꾸기', onClick: () => setPanel('rename') },
              { label: '대화에 초대', onClick: onInvite },
              { label: room.muted ? '알림 켜기' : '알림 끄기', onClick: toggleMute },
              direct && profile && { label: profile.blockedByMe ? '차단 해제' : '차단', onClick: block },
              direct && profile && { label: '사용자 신고', onClick: () => setPanel('report') },
              { label: '대화방 나가기', danger: true, onClick: () => setPanel('leave') },
            ]}
          />
        </header>
        <ChatThread room={room} selfLabel="나" bubble />
      </section>

      {(panel === 'info' || panel === 'members') && (
        <ChatRoomInfoModal room={room} title={title} mode={panel} onClose={() => setPanel(null)} />
      )}

      {panel === 'rename' && <ChatRoomRenameDialog room={room} title={title} onClose={() => setPanel(null)} />}

      {panel === 'leave' && (
        <Dialog
          busy={leaving}
          title="대화방에서 나갈까요?"
          description={
            direct
              ? '나가면 지난 메시지를 볼 수 없어요. 상대가 메시지를 보내면 다시 들어와요.'
              : '나가면 지난 메시지를 볼 수 없고, 다시 들어오려면 초대를 받아야 해요.'
          }
          onClose={() => setPanel(null)}
          actions={
            <>
              <Button variant="danger" disabled={leaving} onClick={leave}>
                나가기
              </Button>
              <Button variant="neutral" onClick={() => setPanel(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
      {panel === 'report' && profile && (
        <ReportModal
          target={{
            contentType: 'USER',
            targetUserUuid: profile.uuid,
            description: `${profile.nickname}님을 신고해요`,
            blockUuid: profile.blockedByMe ? undefined : profile.uuid,
          }}
          onClose={() => setPanel(null)}
          onBlocked={() => loadCounterpart(roomKey).then(setProfile)}
        />
      )}
    </>
  );
}
