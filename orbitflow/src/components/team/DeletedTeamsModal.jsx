import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { getDeletedTeams, restoreTeam } from '../../api/team';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { TeamRow } from './TeamRow';
import { daysFromToday, formatShortDate, parseLocal } from '../../utils/date';
import { showErrorToast } from '../../utils/errorToast';
import closeIcon from '../../assets/icons/close.svg';

// 삭제한 팀 복구(소유자였던 팀, 삭제 후 30일 이내). 복구하면 소유자만 다시 구성원이 된다
export function DeletedTeamsModal({ onClose, onRestored }) {
  const [teams, setTeams] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    getDeletedTeams()
      .then((page) => !ignore && setTeams(page.content))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '삭제한 팀을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, []);

  const restore = async (team) => {
    setBusy(true);
    try {
      onRestored(await restoreTeam(team.uuid));
    } catch (err) {
      showErrorToast(getErrorMessage(err, '복구하지 못했어요.'));
      setBusy(false);
    }
  };

  return (
    <Modal busy={busy} label="삭제한 팀 복구" className="modal--form deleted-teams-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">삭제한 팀 복구</h2>
          <p className="modal__subtitle">삭제하고 30일 안에만 되살릴 수 있어요</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>

      {teams && teams.length === 0 && <p className="page__empty">되살릴 수 있는 팀이 없어요</p>}
      {teams && teams.length > 0 && (
        <div className="team-list">
          {teams.map((team) => (
            <TeamRow
              key={team.uuid}
              name={team.name}
              icon={team.icon}
              subtitle={`${formatShortDate(parseLocal(team.deletedAt))} 삭제 · ${daysFromToday(parseLocal(team.restorableUntil))}일 남음`}
            >
              <Button variant="secondary" dense disabled={busy} onClick={() => restore(team)}>
                복구
              </Button>
            </TeamRow>
          ))}
        </div>
      )}
      <p className="modal__notice">
        팀·역할·카테고리·완료한 할 일이 돌아와요. 다른 구성원은 초대나 가입 신청으로 다시 들어와야 해요.
      </p>
    </Modal>
  );
}
