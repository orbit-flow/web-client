import { useState } from 'react';
import { getErrorMessage } from '../../../api/axios';
import { syncTeamIcon, updateTeam } from '../../../api/team';
import { Button } from '../../ui/Button';
import { TeamFields } from '../TeamFields';
import { showErrorToast } from '../../../utils/errorToast';
import { teamBodyOf, teamFormOf } from '../../../utils/team';
import { useToast } from '../../../hooks/useRealtime';

// 팀 설정 · 일반: 팀 정보(아이콘·이름·소개·공개 범위). 팀 관리 권한이 없으면 읽기만
export function GeneralSection({ team, canManage, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => teamFormOf(team));
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { body, error: invalid } = teamBodyOf(form);
    setNameError(invalid ?? null);
    if (invalid) return;
    setSaving(true);
    try {
      await updateTeam(team.uuid, body);
      await syncTeamIcon(team.uuid, form, team.icon);
      // 올린 파일은 다시 올리지 않게 비운다(미리보기는 그대로)
      setForm((prev) => ({ ...prev, iconFile: null }));
      toast('팀 정보를 저장했어요');
      onSaved();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '팀 정보를 저장하지 못했어요.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card settings-card" onSubmit={handleSubmit}>
      <div className="section-header">
        <h2 className="settings-card__title">팀 정보</h2>
        <span className="section-header__hint">팀 관리 권한이 있어야 바꿀 수 있어요</span>
      </div>
      <TeamFields
        form={form}
        onChange={setForm}
        error={nameError}
        disabled={!canManage}
        idPrefix="team-settings"
      />
      {canManage && (
        <div className="modal__actions">
          <Button variant="neutral" onClick={() => setForm(teamFormOf(team))}>
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            저장
          </Button>
        </div>
      )}
    </form>
  );
}
