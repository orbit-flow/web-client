import { useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { createTeam, syncTeamIcon, updateMyMembership, uploadMyTeamImage } from '../../api/team';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { TeamFields } from './TeamFields';
import { TeamProfileFields } from './TeamProfileModal';
import { showErrorToast } from '../../utils/errorToast';
import { EMPTY_TEAM_FORM, teamBodyOf } from '../../utils/team';
import closeIcon from '../../assets/icons/close.svg';
import { useToast } from '../../hooks/useRealtime';

// 팀 만들기(폭 480). 만든 사람이 소유자가 된다. onCreated(TeamResponse)
// 아래 "내 팀 프로필"에서 소유자의 팀 프로필(사진 · 이름 · 이메일)도 함께 정한다. 비우면 계정 프로필
// 팀을 만든 뒤 내 팀 프로필 API로 저장한다 — 이 단계만 실패하면 팀은 그대로 두고 팀 설정에서 다시 하도록 알린다
export function TeamFormModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_TEAM_FORM);
  const [profile, setProfile] = useState({ nickname: '', email: '' });
  const [image, setImage] = useState(null);
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving] = useState(false);

  const saveOwnerProfile = async (teamUuid) => {
    const nickname = profile.nickname.trim();
    const email = profile.email.trim();
    if (nickname || email) await updateMyMembership(teamUuid, { nickname: nickname || null, email: email || null });
    if (image) await uploadMyTeamImage(teamUuid, image);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { body, error: invalid } = teamBodyOf(form);
    setNameError(invalid ?? null);
    if (invalid) return;
    setSaving(true);
    try {
      const created = await createTeam(body);
      // 아이콘·내 팀 프로필은 팀을 만든 뒤에 올린다 — 여기서만 실패하면 팀은 두고 팀 설정에서 다시 하도록 알린다
      try {
        await syncTeamIcon(created.uuid, form, null);
        await saveOwnerProfile(created.uuid);
        toast('팀을 만들었어요');
      } catch (err) {
        showErrorToast(getErrorMessage(err, '팀은 만들었지만 아이콘이나 내 팀 프로필을 저장하지 못했어요. 팀 설정에서 다시 해 주세요.'));
      }
      onCreated(created);
    } catch (err) {
      showErrorToast(getErrorMessage(err, '팀을 만들지 못했어요.'));
      setSaving(false);
    }
  };

  return (
    <Modal busy={saving} label="팀 만들기" className="modal--form team-form-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">팀 만들기</h2>
          <p className="modal__subtitle">만든 사람이 소유자가 돼요</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>
      <form className="modal__form team-form-modal__form" onSubmit={handleSubmit}>
        <TeamFields form={form} onChange={setForm} error={nameError} idPrefix="new-team" />
        <section className="team-form-modal__profile" aria-label="내 팀 프로필">
          <div className="team-form-modal__profile-head">
            <h3 className="team-form-modal__profile-title">내 팀 프로필</h3>
            <span className="team-fields__hint">이 팀 안에서만 보여요. 비우면 계정 프로필을 써요</span>
          </div>
          <TeamProfileFields
            form={profile}
            onChange={setProfile}
            image={image}
            onImageChange={setImage}
            nicknameLabel="팀 프로필 이름 (선택)"
            disabled={saving}
          />
        </section>
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
