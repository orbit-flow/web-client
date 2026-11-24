import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { getMemberRoles, setMemberRoles } from '../../api/team';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { showErrorToast } from '../../utils/errorToast';
import { TEAM_PERMISSIONS } from '../../utils/team';
import closeIcon from '../../assets/icons/close.svg';

const permissionSummary = (permissions) =>
  permissions.length === 0
    ? '권한 없음'
    : TEAM_PERMISSIONS.filter((item) => permissions.includes(item.value))
        .map((item) => item.label)
        .join(' · ');

// 구성원 역할 바꾸기(폭 440). roles: 팀의 모든 역할(우선순위 높은 순)
// 내가 갖지 않은 권한이 든 역할은 붙이거나 뗄 수 없어 막아 둔다(myPermissions)
export function MemberRolesModal({ teamUuid, member, roles, myPermissions, owner, onClose, onSaved }) {
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;
    getMemberRoles(teamUuid, member.uuid)
      .then((list) => !ignore && setSelected(new Set(list.map((role) => role.id))))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '역할을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [teamUuid, member.uuid]);

  const grantable = (role) => owner || role.permissions.every((permission) => myPermissions.includes(permission));
  const top = roles.find((role) => selected?.has(role.id));

  const toggle = (roleId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      await setMemberRoles(teamUuid, member.uuid, [...selected]);
      onSaved();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '역할을 바꾸지 못했어요.'));
      setSaving(false);
    }
  };

  return (
    <Modal busy={saving} label={`${member.nickname}님의 역할`} className="modal--form member-roles-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">{member.nickname}님의 역할</h2>
          <p className="modal__subtitle">역할은 여러 개 줄 수 있어요. 권한은 가진 역할을 모두 합쳐 정해져요</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>

      <div className="member-roles-modal__list">
        {member.owner && (
          <Checkbox label="소유자" description="소유자 위임으로만 바뀔 수 있어요" checked disabled readOnly />
        )}
        {roles.map((role) => (
          <Checkbox
            key={role.id}
            label={role.name}
            description={grantable(role) ? permissionSummary(role.permissions) : '내가 갖지 않은 권한이 들어 있어 바꿀 수 없어요'}
            checked={Boolean(selected?.has(role.id))}
            disabled={!selected || !grantable(role)}
            onChange={() => toggle(role.id)}
          />
        ))}
      </div>

      <p className="modal__notice">
        대표 역할(이름 옆 배지)은 우선순위가 가장 높은 역할이에요{top ? ` → ${top.name}` : ''}
      </p>
      <div className="modal__actions">
        <Button variant="neutral" onClick={onClose}>
          취소
        </Button>
        <Button onClick={save} disabled={saving || !selected}>
          저장
        </Button>
      </div>
    </Modal>
  );
}
