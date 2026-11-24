import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../../api/axios';
import { openTeamDirectChat } from '../../../api/chat';
import { addToBlacklist, kickMember } from '../../../api/team';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Input } from '../../ui/Input';
import { MemberRolesModal } from '../MemberRolesModal';
import { MemberTable } from '../MemberTable';
import { showErrorToast } from '../../../utils/errorToast';
import plusIcon from '../../../assets/icons/plus.svg';
import searchIcon from '../../../assets/icons/search.svg';

// 팀 설정 · 구성원: 찾기 + 표(더보기: 역할 바꾸기 · 1:1 대화 · 내보내기 · 내보내고 블랙리스트)
export function MembersSection({ team, members, roles, membership, myUuid, onInvite, onChanged }) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [panel, setPanel] = useState(null); // { type: 'roles' | 'kick' | 'ban', member }
  const [busy, setBusy] = useState(false);

  const query = keyword.trim().toLowerCase();
  const visible = members.filter(
    (member) => member.nickname.toLowerCase().includes(query) || member.email?.toLowerCase().includes(query),
  );

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
      setPanel(null);
      onChanged();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const menuItems = (member) => {
    const me = member.uuid === myUuid;
    return [
      { label: '역할 바꾸기', onClick: () => setPanel({ type: 'roles', member }) },
      !me && {
        label: '1:1 대화',
        onClick: () =>
          openTeamDirectChat(team.uuid, member.uuid).then(
            (room) => navigate(`/teams/${team.uuid}?tab=chatrooms&room=${room.uuid}`),
            (err) => showErrorToast(getErrorMessage(err, '대화를 열지 못했어요.')),
          ),
      },
      !me && !member.owner && { label: '팀에서 내보내기', danger: true, onClick: () => setPanel({ type: 'kick', member }) },
      !me && !member.owner && { label: '내보내고 블랙리스트에 추가', danger: true, onClick: () => setPanel({ type: 'ban', member }) },
    ];
  };

  const target = panel?.member;

  return (
    <section className="settings-section" aria-label="구성원">
      <div className="section-header">
        <h2 className="section-header__title">구성원</h2>
        <Badge>{members.length}</Badge>
        <span className="board-column__spacer" />
        <Button iconLeft={plusIcon} onClick={onInvite}>
          초대하기
        </Button>
      </div>
      <Input aria-label="구성원 찾기" iconLeft={searchIcon} placeholder="이름 · 이메일로 찾기" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
      <MemberTable members={visible} myUuid={myUuid} menuItems={menuItems} />

      {panel?.type === 'roles' && (
        <MemberRolesModal
          teamUuid={team.uuid}
          member={target}
          roles={roles}
          myPermissions={membership.permissions}
          owner={membership.owner}
          onClose={() => setPanel(null)}
          onSaved={() => {
            setPanel(null);
            onChanged();
          }}
        />
      )}
      {(panel?.type === 'kick' || panel?.type === 'ban') && (
        <Dialog
          busy={busy}
          title={panel.type === 'kick' ? `${target.nickname}님을 내보낼까요?` : `${target.nickname}님을 내보내고 막을까요?`}
          description={
            panel.type === 'kick'
              ? '맡던 할 일은 카테고리 관리자에게 넘어가고, 팀 채팅방에서도 빠져요. 다시 초대하거나 가입을 받을 수 있어요.'
              : '내보낸 뒤 블랙리스트에 올려 가입 신청도, 초대도 받을 수 없게 해요.'
          }
          onClose={() => setPanel(null)}
          actions={
            <>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await kickMember(team.uuid, target.uuid);
                    if (panel.type === 'ban') await addToBlacklist(team.uuid, target.uuid);
                  }, '내보내지 못했어요.')
                }
              >
                내보내기
              </Button>
              <Button variant="neutral" onClick={() => setPanel(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
    </section>
  );
}
