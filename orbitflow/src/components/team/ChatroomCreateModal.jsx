import { useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { createTeamChatroom, openTeamDirectChat } from '../../api/chat';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Tag } from '../ui/Tag';
import { showErrorToast } from '../../utils/errorToast';
import closeIcon from '../../assets/icons/close.svg';
import searchIcon from '../../assets/icons/search.svg';

// 팀 채팅방 만들기(폭 520): 이름 + 역할로 한꺼번에 + 구성원 직접 고르기
// 역할 없이 구성원 한 명만 고르면 그 사람과의 팀 1:1 대화를 연다(이미 있으면 그 방, 이름은 쓰지 않음)
// roles는 팀 관리 권한이 있을 때만 받아 올 수 있어 없으면 역할 줄을 숨긴다
export function ChatroomCreateModal({ teamUuid, members, roles, myUuid, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [roleIds, setRoleIds] = useState([]);
  const [userUuids, setUserUuids] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (setter, value) => setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  const visible = members.filter((member) => member.nickname.toLowerCase().includes(keyword.trim().toLowerCase()));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (roleIds.length === 0 && userUuids.length === 0) {
      showErrorToast('함께할 구성원이나 역할을 골라 주세요');
      return;
    }
    const direct = roleIds.length === 0 && userUuids.length === 1;
    setSaving(true);
    try {
      onCreated(
        direct
          ? await openTeamDirectChat(teamUuid, userUuids[0])
          : await createTeamChatroom(teamUuid, { title: title.trim() || undefined, userUuids, roleIds }),
      );
    } catch (err) {
      showErrorToast(getErrorMessage(err, '채팅방을 만들지 못했어요.'));
      setSaving(false);
    }
  };

  return (
    <Modal busy={saving} label="채팅방 만들기" className="modal--form chatroom-create-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">채팅방 만들기</h2>
          <p className="modal__subtitle">역할로 한꺼번에 고르거나 구성원을 직접 골라요. 한 명만 고르면 1:1 대화예요</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>
      <form className="modal__form chatroom-create-modal__form" onSubmit={handleSubmit}>
        <Input label="채팅방 이름" value={title} maxLength={100} placeholder="프론트엔드" onChange={(event) => setTitle(event.target.value)} />
        {roles && roles.length > 0 && (
          <div className="chatroom-create-modal__group">
            <span className="field__label">역할로 추가</span>
            <div className="chatroom-create-modal__roles">
              {roles.map((role) => (
                <Tag key={role.id} size="lg" selected={roleIds.includes(role.id)} onClick={() => toggle(setRoleIds, role.id)}>
                  {role.name}
                </Tag>
              ))}
            </div>
          </div>
        )}
        <div className="chatroom-create-modal__group">
          <span className="field__label">
            구성원 <Badge tone="accent">{userUuids.length}명 선택</Badge>
          </span>
          <Input aria-label="구성원 찾기" iconLeft={searchIcon} placeholder="이름으로 찾기" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <div className="people-list chatroom-create-modal__members">
            {visible.map((member) => {
              const me = member.uuid === myUuid;
              return (
                <div key={member.uuid} className="person-row chatroom-create-modal__member">
                  <AvatarSlot src={member.profileImage} size="sm" />
                  <span className="person-row__text">
                    <span className="person-row__name">
                      {member.nickname}
                      {me && ' (나)'}
                    </span>
                    <span className="person-row__subtitle">{member.owner && !member.topRoleName ? '소유자' : member.topRoleName ?? '역할 없음'}</span>
                  </span>
                  <Checkbox
                    aria-label={`${member.nickname} 고르기`}
                    checked={me || userUuids.includes(member.uuid)}
                    disabled={me}
                    onChange={() => toggle(setUserUuids, member.uuid)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="modal__actions">
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            만들기
          </Button>
        </div>
      </form>
    </Modal>
  );
}
