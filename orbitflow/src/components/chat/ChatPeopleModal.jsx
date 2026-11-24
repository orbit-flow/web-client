import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { createGroupChat, getChatroomMembers, inviteToChatroom, openDirectChat } from '../../api/chat';
import { getFollowers, getFollowings } from '../../api/follow';
import { getTeamMembers } from '../../api/team';
import { useRealtime } from '../../hooks/useRealtime';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { showErrorToast } from '../../utils/errorToast';
import closeIcon from '../../assets/icons/close.svg';
import searchIcon from '../../assets/icons/search.svg';

// 고를 수 있는 사람: 팀 방이면 팀 구성원, 아니면 팔로잉 + 팔로워
async function loadCandidates(myUuid, teamUuid) {
  if (teamUuid) {
    const members = await getTeamMembers(teamUuid);
    return members
      .filter((member) => member.uuid !== myUuid)
      .map((member) => ({ uuid: member.uuid, nickname: member.nickname, profileImage: member.profileImage, relation: member.topRoleName ?? '팀 구성원' }));
  }
  const [followings, followers] = await Promise.all([getFollowings(myUuid, { size: 100 }), getFollowers(myUuid, { size: 100 })]);
  const people = new Map();
  for (const person of followings.content) people.set(person.uuid, { ...person, relation: '팔로잉' });
  for (const person of followers.content) {
    if (!people.has(person.uuid)) people.set(person.uuid, { ...person, relation: '팔로워' });
  }
  return [...people.values()].filter((person) => !person.blockedByMe);
}

// 새 대화(room 없음): 한 명이면 1:1, 여럿이면 그룹 대화
// 대화에 초대(room 있음): 1:1이면 기존 대화는 두고 새 그룹을 만들고, 그룹이면 같은 방에 더한다
// onDone(ChatroomResponse)
export function ChatPeopleModal({ room, onClose, onDone }) {
  const { myUuid } = useRealtime();
  const [people, setPeople] = useState(null);
  const [joined, setJoined] = useState(() => new Set());
  const [selected, setSelected] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const inviting = Boolean(room);

  useEffect(() => {
    if (!myUuid) return undefined;
    let ignore = false;
    Promise.all([loadCandidates(myUuid, room?.teamUuid), room ? getChatroomMembers(room.uuid) : null])
      .then(([candidates, memberPage]) => {
        if (ignore) return;
        setPeople(candidates);
        if (memberPage) setJoined(new Set(memberPage.content.map((member) => member.uuid)));
      })
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '사람 목록을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [myUuid, room]);

  const toggle = (person) =>
    setSelected((prev) => (prev.some((item) => item.uuid === person.uuid) ? prev.filter((item) => item.uuid !== person.uuid) : [...prev, person]));

  const query = keyword.trim().toLowerCase();
  const visible = (people ?? []).filter((person) => person.nickname.toLowerCase().includes(query));
  // 1:1 초대는 나 + 상대 + 고른 사람으로 새 그룹
  const groupSize = inviting && room.type === 'DIRECT' ? selected.length + 2 : selected.length + 1;
  const submitLabel = !inviting ? '대화 시작' : room.type === 'DIRECT' ? `${groupSize}명으로 그룹 만들기` : '초대하기';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selected.length === 0) {
      showErrorToast('한 명 이상 골라 주세요');
      return;
    }
    const userUuids = selected.map((person) => person.uuid);
    setSaving(true);
    try {
      if (inviting) onDone(await inviteToChatroom(room.uuid, userUuids));
      else if (userUuids.length === 1) onDone(await openDirectChat(userUuids[0]));
      else onDone(await createGroupChat({ title: title.trim() || undefined, userUuids }));
    } catch (err) {
      showErrorToast(getErrorMessage(err, inviting ? '초대하지 못했어요.' : '대화를 시작하지 못했어요.'));
      setSaving(false);
    }
  };

  return (
    <Modal busy={saving} label={inviting ? '대화에 초대' : '새 대화'} className="modal--form chat-people-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">{inviting ? '대화에 초대' : '새 대화'}</h2>
          <p className="modal__subtitle">
            {!inviting
              ? '한 명을 고르면 1:1, 여러 명이면 그룹 대화가 돼요'
              : room.type === 'DIRECT'
                ? `${room.counterpartNickname ?? '상대'}님과의 1:1 대화에 초대하면, 기존 대화는 그대로 두고 새 그룹 대화가 만들어져요`
                : '고른 사람이 이 대화에 들어와요'}
          </p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>

      <form className="modal__form chat-people-modal__form" onSubmit={handleSubmit}>
        {selected.length > 0 && (
          <div className="chat-people-modal__chips">
            {selected.map((person) => (
              <span key={person.uuid} className="chat-people-modal__chip">
                {person.nickname}
                <button type="button" aria-label={`${person.nickname} 빼기`} onClick={() => toggle(person)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <Input aria-label="이름으로 찾기" iconLeft={searchIcon} placeholder="이름으로 찾기" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        <div className="people-list chat-people-modal__list">
          {people && visible.length === 0 && <p className="page__empty">{people.length === 0 ? '고를 수 있는 사람이 없어요' : '맞는 사람이 없어요'}</p>}
          {visible.map((person) => {
            const already = joined.has(person.uuid);
            return (
              <div key={person.uuid} className="person-row chat-people-modal__row">
                <AvatarSlot src={person.profileImage} size="sm" />
                <span className="person-row__text">
                  <span className="person-row__name">{person.nickname}</span>
                  <span className="person-row__subtitle">{already ? '이미 대화 중' : person.relation}</span>
                </span>
                <Checkbox
                  aria-label={`${person.nickname} 고르기`}
                  checked={already || selected.some((item) => item.uuid === person.uuid)}
                  disabled={already}
                  onChange={() => toggle(person)}
                />
              </div>
            );
          })}
        </div>
        {!inviting && selected.length > 1 && (
          <Input label="그룹 이름 (선택)" value={title} maxLength={100} placeholder="스터디 모임" onChange={(event) => setTitle(event.target.value)} />
        )}
        {!room?.teamUuid && <p className="field__hint">팔로우하지 않은 사람은 상대가 허용한 경우에만 초대할 수 있어요</p>}
        <div className="modal__actions">
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={saving || selected.length === 0}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
