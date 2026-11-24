import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { getErrorMessage } from '../../../api/axios';
import {
  createRole,
  deleteRole,
  getMemberRoles,
  getRoleCategoryAccess,
  getRoleMembers,
  setDefaultRole,
  setMemberRoles,
  updateRole,
} from '../../../api/team';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { ColorSwatches } from '../../ui/ColorField';
import { Checkbox } from '../../ui/Checkbox';
import { LeaveConfirmDialog, UnsavedChangesGuard } from '../../ui/Dialog';
import { EmptyHint, Icon } from '../../ui/Icon';
import { Input } from '../../ui/Input';
import { Menu } from '../../ui/Menu';
import { Select } from '../../ui/Select';
import { Switch } from '../../ui/Switch';
import { useToast } from '../../../hooks/useRealtime';
import { normalizeHex } from '../../../utils/color';
import { showErrorToast } from '../../../utils/errorToast';
import { categoryColor } from '../../../utils/todo';
import { roleColor, TEAM_PERMISSIONS, TEAM_VISIBILITY } from '../../../utils/team';
import dragIcon from '../../../assets/icons/drag.svg';
import dashboardIcon from '../../../assets/icons/dashboard.svg';
import plusIcon from '../../../assets/icons/plus.svg';
import { useReload } from '../../../hooks/useReload';

const ROLE_SWATCHES = ['E5484D', 'F08C00', '21B273', '3D78F5', '8C5CF5', 'ED5C8C', '8A8F98'];
const ACCESS_KEYS = [
  { key: 'view', label: '열람' },
  { key: 'edit', label: '편집' },
  { key: 'delete', label: '삭제' },
];

const roleBody = (role, priority = role.priority) => ({
  name: role.name,
  color: role.color === 'none' ? undefined : role.color,
  priority,
  permissions: role.permissions,
});

const OWNER = 'owner';
const samePermissions = (a, b) => a.length === b.length && a.every((permission) => b.includes(permission));

// 팀 설정 · 역할 · 권한: 왼쪽 역할 목록(끌어서 우선순위) + 오른쪽 편집(권한·카테고리 접근·구성원)
// 맨 위 소유자 줄은 고를 수 있고 고르면 소유자 권한 정보(모든 권한, 바꿀 수 없음)
// 편집 중 저장 안 한 내용이 있으면 다른 역할로 바꾸기 전에 묻는다
export function RolesSection({ team, roles, members, membership, onChanged }) {
  const [selectedId, setSelectedId] = useState(roles[0]?.id ?? null);
  const [dragId, setDragId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [pendingId, setPendingId] = useState(null); // 저장 안 한 내용이 있을 때 바꾸려던 역할
  const ownerSelected = selectedId === OWNER;
  const selected = ownerSelected ? null : (roles.find((role) => role.id === selectedId) ?? roles[0]);

  const select = (id) => {
    if (id === (ownerSelected ? OWNER : selected?.id)) return;
    if (editorDirty) setPendingId(id);
    else setSelectedId(id);
  };

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
      onChanged();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const addRole = () =>
    run(async () => {
      const top = roles[0]?.priority ?? 0;
      const created = await createRole(team.uuid, { name: '새 역할', priority: top + 1, permissions: [] });
      setEditorDirty(false);
      setSelectedId(created.id);
    }, '역할을 만들지 못했어요.');

  // 끌어다 놓은 순서대로 우선순위를 다시 매긴다(위가 높음). 바뀐 역할만 저장
  const drop = (targetId) => {
    if (dragId == null || dragId === targetId) return;
    const order = roles.filter((role) => role.id !== dragId);
    order.splice(order.findIndex((role) => role.id === targetId), 0, roles.find((role) => role.id === dragId));
    setDragId(null);
    run(async () => {
      for (const [index, role] of order.entries()) {
        const priority = order.length - index;
        if (role.priority !== priority) await updateRole(team.uuid, role.id, roleBody(role, priority));
      }
    }, '순서를 바꾸지 못했어요.');
  };

  return (
    <div className="roles-layout">
      <section className="roles-list" aria-label="역할 목록">
        <div className="section-header">
          <h2 className="section-header__title">역할</h2>
          <Badge>{roles.length}</Badge>
          <Button variant="secondary" size="md" iconLeft={plusIcon} className="section-header__action" disabled={busy || editorDirty} onClick={addRole}>
            새 역할 만들기
          </Button>
        </div>
        <ul className="roles-list__items">
          <li className={classNames('roles-list__item', { 'roles-list__item--selected': ownerSelected })}>
            <button type="button" className="roles-list__select" onClick={() => select(OWNER)}>
              <span className="roles-list__dot" style={{ backgroundColor: 'var(--danger-500)' }} aria-hidden="true" />
              <span className="roles-list__name">소유자</span>
              <span className="roles-list__count num">{members.filter((member) => member.owner).length}명</span>
            </button>
          </li>
          {roles.map((role) => (
            <li
              key={role.id}
              className={classNames('roles-list__item', {
                'roles-list__item--selected': role.id === selected?.id,
                'roles-list__item--dragging': role.id === dragId,
              })}
              draggable
              onDragStart={() => setDragId(role.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => drop(role.id)}
            >
              <span className="roles-list__handle" aria-hidden="true">
                <Icon src={dragIcon} size={16} />
              </span>
              <button type="button" className="roles-list__select" onClick={() => select(role.id)}>
                <span className="roles-list__dot" style={{ backgroundColor: roleColor(role.color) }} aria-hidden="true" />
                <span className="roles-list__name">
                  {role.name}
                  {role.isDefault && ' · 기본'}
                </span>
                <span className="roles-list__count num">{role.memberCount}명</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="field__hint">끌어서 우선순위를 바꿔요(위가 높음)</p>
      </section>

      {ownerSelected && <OwnerInfo members={members} />}
      {selected && (
        <RoleEditor
          key={selected.id}
          team={team}
          role={selected}
          members={members}
          membership={membership}
          onChanged={onChanged}
          onDirtyChange={setEditorDirty}
          onDeleted={() => setSelectedId(null)}
        />
      )}
      {pendingId != null && (
        <LeaveConfirmDialog
          onLeave={() => {
            setEditorDirty(false);
            setSelectedId(pendingId);
            setPendingId(null);
          }}
          onStay={() => setPendingId(null)}
        />
      )}
    </div>
  );
}

// 소유자: 모든 권한을 갖고 바꿀 수 없다. 소유자 넘기기는 위험 구역의 "소유자 위임"
function OwnerInfo({ members }) {
  const owners = members.filter((member) => member.owner);
  return (
    <div className="role-editor">
      <section className="card settings-card" aria-label="소유자 권한">
        <div className="section-header">
          <h2 className="settings-card__title">소유자</h2>
          <span className="section-header__hint">모든 권한을 가져요</span>
        </div>
        <div className="role-editor__group">
          <span className="field__label">팀 권한</span>
          <div className="role-permissions">
            {TEAM_PERMISSIONS.map((permission) => (
              <div key={permission.value} className="role-permissions__row">
                <span className="role-permissions__text">
                  <span className="role-permissions__label">{permission.label}</span>
                  <span className="role-permissions__desc">{permission.description}</span>
                </span>
                <Switch aria-label={permission.label} checked disabled onChange={() => {}} />
              </div>
            ))}
          </div>
          <p className="field__hint">소유자 권한은 바꿀 수 없어요. 팀 삭제 · 소유자 위임도 소유자만 할 수 있어요</p>
        </div>
      </section>
      <section className="card settings-card" aria-label="소유자 구성원">
        <div className="section-header">
          <h2 className="settings-card__title">소유자</h2>
          <Badge>{owners.length}</Badge>
        </div>
        <div className="role-members">
          {owners.map((member) => (
            <span key={member.uuid} className="role-members__chip">
              {member.nickname}
            </span>
          ))}
        </div>
        <p className="field__hint">다른 구성원에게 소유자를 넘기려면 팀 설정 → 위험 구역의 "소유자 위임"을 써요</p>
      </section>
    </div>
  );
}

// 역할 하나 편집. 역할이 바뀌면 key로 새로 만든다
// 바꾼 내용(이름 · 색 · 권한 · 카테고리 접근)이 있을 때만 저장할 수 있고, 저장 안 하고 나가면 묻는다(onDirtyChange로 목록에도 알림)
function RoleEditor({ team, role, members, membership, onChanged, onDirtyChange, onDeleted }) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({ name: role.name, color: roleColor(role.color), permissions: role.permissions }));
  const [access, setAccess] = useState([]);
  const [changedAccess, setChangedAccess] = useState(() => new Set());
  const [roleMembers, setRoleMembers] = useState([]);
  const { reloadKey, reload } = useReload();
  const [busy, setBusy] = useState(false);

  const dirty =
    form.name.trim() !== role.name ||
    normalizeHex(form.color) !== normalizeHex(roleColor(role.color)) ||
    !samePermissions(form.permissions, role.permissions) ||
    changedAccess.size > 0;

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const myPermissions = membership.permissions;
  const canTouch = (permission) => membership.owner || myPermissions.includes(permission);

  useEffect(() => {
    let ignore = false;
    Promise.all([getRoleCategoryAccess(team.uuid, role.id), getRoleMembers(team.uuid, role.id)])
      .then(([accessList, memberList]) => {
        if (ignore) return;
        setAccess(accessList);
        setRoleMembers(memberList);
      })
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '역할 정보를 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [team.uuid, role.id, reloadKey]);

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
      return true;
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const togglePermission = (permission) =>
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }));

  // 편집·삭제를 켜면 열람도 켠다(서버도 같은 규칙)
  const toggleAccess = (categoryId, key) => {
    setAccess((prev) =>
      prev.map((row) => {
        if (row.categoryId !== categoryId) return row;
        const next = { ...row, [key]: !row[key] };
        if (key !== 'view' && next[key]) next.view = true;
        if (key === 'view' && !next.view) Object.assign(next, { edit: false, delete: false });
        return next;
      }),
    );
    setChangedAccess((prev) => new Set(prev).add(categoryId));
  };

  const save = async () => {
    const name = form.name.trim();
    if (!name) {
      showErrorToast('역할 이름을 입력해 주세요');
      return;
    }
    const categoryAccess = access
      .filter((row) => changedAccess.has(row.categoryId))
      .map(({ categoryId, view, edit, delete: remove }) => ({ categoryId, view, edit, delete: remove }));
    const ok = await run(
      () =>
        updateRole(team.uuid, role.id, {
          name,
          color: normalizeHex(form.color)?.slice(1),
          priority: role.priority,
          permissions: form.permissions,
          categoryAccess,
        }),
      '역할을 저장하지 못했어요.',
    );
    if (ok) {
      toast('역할을 저장했어요');
      setChangedAccess(new Set());
      onChanged();
    }
  };

  // 구성원의 역할 전체를 받아 이 역할만 더하거나 뺀다
  const changeMember = async (userUuid, add) => {
    const ok = await run(async () => {
      const current = (await getMemberRoles(team.uuid, userUuid)).map((item) => item.id);
      const next = add ? [...new Set([...current, role.id])] : current.filter((id) => id !== role.id);
      await setMemberRoles(team.uuid, userUuid, next);
    }, '구성원 역할을 바꾸지 못했어요.');
    if (ok) {
      reload();
      onChanged();
    }
  };

  const inRole = new Set(roleMembers.map((member) => member.uuid));
  const addable = members.filter((member) => !inRole.has(member.uuid));

  return (
    <div className="role-editor">
      <UnsavedChangesGuard when={dirty} />
      <section className="card settings-card" aria-label="역할 편집">
        <div className="section-header">
          <h2 className="settings-card__title">역할 편집</h2>
          <span className="section-header__hint">{role.name}</span>
          <span className="board-column__spacer" />
          <Menu
            label="역할 메뉴"
            items={[
              !role.isDefault && {
                label: '기본 역할로 지정',
                onClick: () => run(() => setDefaultRole(team.uuid, role.id), '기본 역할로 지정하지 못했어요.').then((ok) => ok && onChanged()),
              },
              !role.isDefault && {
                label: '역할 삭제',
                danger: true,
                onClick: () =>
                  run(() => deleteRole(team.uuid, role.id), '역할을 지우지 못했어요.').then((ok) => {
                    if (!ok) return;
                    onDeleted();
                    onChanged();
                  }),
              },
            ]}
          />
        </div>
        <Input label="역할 이름" value={form.name} maxLength={50} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        <ColorSwatches
          label="색"
          colors={ROLE_SWATCHES}
          value={form.color}
          onChange={(color) => setForm((prev) => ({ ...prev, color }))}
          withPicker
        />
        <div className="role-editor__group">
          <span className="field__label">팀 권한</span>
          <div className="role-permissions">
            {TEAM_PERMISSIONS.map((permission) => (
              <div key={permission.value} className="role-permissions__row">
                <span className="role-permissions__text">
                  <span className="role-permissions__label">{permission.label}</span>
                  <span className="role-permissions__desc">{permission.description}</span>
                </span>
                <Switch
                  aria-label={permission.label}
                  checked={form.permissions.includes(permission.value)}
                  disabled={!canTouch(permission.value)}
                  onChange={() => togglePermission(permission.value)}
                />
              </div>
            ))}
          </div>
          <p className="field__hint">내가 갖지 않은 권한은 켤 수 없어요</p>
        </div>
      </section>

      <section className="card settings-card" aria-label="카테고리 접근">
        <div className="section-header">
          <h2 className="settings-card__title">카테고리 접근</h2>
          <Badge>{access.length}</Badge>
        </div>
        {access.length === 0 ? (
          <EmptyHint icon={dashboardIcon} title="팀 카테고리가 없어요" />
        ) : (
          <div className="data-table role-access">
            <div className="data-table__head">
              <span className="data-table__grow">카테고리</span>
              <span className="role-access__visibility">공개 범위</span>
              {ACCESS_KEYS.map((item) => (
                <span key={item.key} className="role-access__cell">
                  {item.label}
                </span>
              ))}
            </div>
            {access.map((row) => (
              <div key={row.categoryId} className="data-table__row">
                <span className="data-table__grow role-access__name">
                  <span className="role-access__dot" style={{ backgroundColor: categoryColor(row.color) }} aria-hidden="true" />
                  {row.name}
                </span>
                <span className="role-access__visibility">
                  <Badge>{TEAM_VISIBILITY[row.visibility]?.short}</Badge>
                </span>
                {ACCESS_KEYS.map((item) => (
                  <span key={item.key} className="role-access__cell">
                    <Checkbox aria-label={`${row.name} ${item.label}`} checked={row[item.key]} onChange={() => toggleAccess(row.categoryId, item.key)} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
        <p className="field__hint">공개 범위가 "구성원"인 카테고리는 이 표와 상관없이 모든 구성원이 열람해요. 바꾼 줄은 아래 저장 버튼으로 함께 저장돼요.</p>
      </section>

      <section className="card settings-card" aria-label="이 역할의 구성원">
        <div className="section-header">
          <h2 className="settings-card__title">이 역할의 구성원</h2>
          <Badge>{roleMembers.length}</Badge>
        </div>
        <div className="role-members">
          {roleMembers.map((member) => (
            <span key={member.uuid} className="role-members__chip">
              {member.nickname}
              <button type="button" className="role-members__remove" aria-label={`${member.nickname} 빼기`} disabled={busy} onClick={() => changeMember(member.uuid, false)}>
                <span aria-hidden="true">×</span>
              </button>
            </span>
          ))}
          {addable.length > 0 && (
            <Select
              aria-label="구성원 추가"
              value=""
              disabled={busy}
              onChange={(event) => event.target.value && changeMember(event.target.value, true)}
              options={[{ value: '', label: '+ 구성원 추가' }, ...addable.map((member) => ({ value: member.uuid, label: member.nickname }))]}
              className="role-members__add"
            />
          )}
        </div>
      </section>

      {/* 역할 편집 · 카테고리 접근을 한 번에 저장(구성원 넣고 빼기는 누르는 즉시 저장) — 맨 아래 오른쪽 */}
      <div className="role-editor__actions">
        <Button size="md" disabled={busy || !dirty} onClick={save}>
          저장
        </Button>
      </div>
    </div>
  );
}
