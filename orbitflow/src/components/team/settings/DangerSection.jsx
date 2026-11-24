import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../../../api/axios';
import { deleteTeam, leaveTeam, transferOwner } from '../../../api/team';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { showErrorToast } from '../../../utils/errorToast';
import trashIcon from '../../../assets/icons/trash.svg';

// 팀 설정 · 위험 구역: 소유자 위임(소유자) · 팀 나가기(소유자 제외) · 팀 삭제(소유자, 이름 확인)
export function DangerSection({ team, members, myUuid, onChanged }) {
  const navigate = useNavigate();
  const owner = team.owner;
  const candidates = members.filter((member) => member.uuid !== myUuid);
  const [nextOwner, setNextOwner] = useState(candidates[0]?.uuid ?? '');
  const [confirmName, setConfirmName] = useState('');
  const [dialog, setDialog] = useState(null); // 'transfer' | 'leave'
  const [busy, setBusy] = useState(false);

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
      setBusy(false);
    }
    setDialog(null);
  };

  const target = candidates.find((member) => member.uuid === nextOwner);

  return (
    <div className="settings-section">
      {owner && (
        <section className="danger-card" aria-label="소유자 위임">
          <h2 className="danger-card__title">소유자 위임</h2>
          <p className="danger-card__desc">소유자는 한 명이에요. 넘기면 나는 가진 역할의 권한만 남아요.</p>
          <div className="danger-card__row">
            <Select
              label="새 소유자"
              value={nextOwner}
              onChange={(event) => setNextOwner(event.target.value)}
              options={candidates.map((member) => ({
                value: member.uuid,
                label: member.topRoleName ? `${member.nickname} (${member.topRoleName})` : member.nickname,
              }))}
              className="danger-card__grow"
            />
            <Button variant="danger" disabled={busy || !target} onClick={() => setDialog('transfer')}>
              소유자 넘기기
            </Button>
          </div>
        </section>
      )}

      <section className="danger-card" aria-label="팀 나가기">
        <h2 className="danger-card__title">팀 나가기</h2>
        <p className="danger-card__desc">나가면 이 팀의 할 일 배정과 채팅방에서 빠져요.</p>
        <div className="danger-card__row">
          {owner && <p className="danger-card__warning">소유자는 나갈 수 없어요. 먼저 소유자를 넘겨 주세요.</p>}
          <span className="board-column__spacer" />
          <Button variant="danger" disabled={busy || owner} onClick={() => setDialog('leave')}>
            팀 나가기
          </Button>
        </div>
      </section>

      {owner && (
        <section className="danger-card" aria-label="팀 삭제">
          <h2 className="danger-card__title">팀 삭제</h2>
          <p className="danger-card__desc">
            팀 카테고리 · 할 일 · 채팅방이 모두 지워져요. 30일 안에는 팀 목록의 "삭제한 팀 복구"로 되살릴 수 있어요.
          </p>
          <div className="danger-card__row">
            <Input
              label="확인을 위해 팀 이름을 입력하세요"
              value={confirmName}
              placeholder={team.name}
              onChange={(event) => setConfirmName(event.target.value)}
              className="danger-card__grow"
            />
            <Button
              variant="danger"
              iconLeft={trashIcon}
              disabled={busy || confirmName.trim() !== team.name}
              onClick={() =>
                run(async () => {
                  await deleteTeam(team.uuid);
                  // 지운 팀 화면이 기록에 남지 않게 바꿔 끼운다(뒤로 가기로 막다른 화면에 오지 않게)
                  navigate('/teams', { replace: true });
                }, '팀을 지우지 못했어요.')
              }
            >
              팀 삭제
            </Button>
          </div>
        </section>
      )}

      {dialog === 'transfer' && target && (
        <Dialog
          busy={busy}
          title={`${target.nickname}님에게 소유자를 넘길까요?`}
          description="되돌리려면 새 소유자가 다시 넘겨줘야 해요."
          onClose={() => setDialog(null)}
          actions={
            <>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await transferOwner(team.uuid, target.uuid);
                    setBusy(false);
                    onChanged();
                  }, '소유자를 넘기지 못했어요.')
                }
              >
                넘기기
              </Button>
              <Button variant="neutral" onClick={() => setDialog(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
      {dialog === 'leave' && (
        <Dialog
          busy={busy}
          title={`${team.name}에서 나갈까요?`}
          description="맡던 할 일은 카테고리 관리자에게 넘어가요. 다시 들어오려면 초대나 가입 신청이 필요해요."
          onClose={() => setDialog(null)}
          actions={
            <>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await leaveTeam(team.uuid);
                    navigate('/teams');
                  }, '팀에서 나가지 못했어요.')
                }
              >
                나가기
              </Button>
              <Button variant="neutral" onClick={() => setDialog(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
