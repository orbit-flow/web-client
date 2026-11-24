import { useRef, useState } from 'react';
import { getErrorMessage } from '../../../api/axios';
import { deleteMyTeamImage, updateMyMembership, uploadMyTeamImage } from '../../../api/team';
import { AvatarSlot } from '../../ui/AvatarSlot';
import { Button } from '../../ui/Button';
import { GlyphButton } from '../../ui/GlyphButton';
import { Input } from '../../ui/Input';
import { useToast } from '../../../hooks/useRealtime';
import { showErrorToast } from '../../../utils/errorToast';
import imageIcon from '../../../assets/icons/image.svg';
import trashIcon from '../../../assets/icons/trash.svg';

// 팀 설정 · 내 팀 프로필: 이 팀에서만 쓰는 사진 · 이름 · 이메일(비우면 계정 값으로 표시)
export function MyProfileSection({ team, membership, onChanged }) {
  const [form, setForm] = useState({ nickname: membership.nickname ?? '', email: membership.email ?? '' });
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  // done: 성공하면 띄울 토스트 문구
  const run = async (task, fallback, done) => {
    setBusy(true);
    try {
      await task();
      toast(done);
      onChanged();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    run(() => updateMyMembership(team.uuid, { nickname: form.nickname.trim(), email: form.email.trim() }), '팀 프로필을 저장하지 못했어요.', '팀 프로필을 저장했어요');
  };

  return (
    <form className="card settings-card" onSubmit={handleSubmit}>
      <div className="section-header">
        <h2 className="settings-card__title">내 팀 프로필</h2>
        <span className="section-header__hint">이 팀 안에서만 보여요. 비우면 계정 프로필을 써요</span>
      </div>
      <div className="team-fields__icon">
        <AvatarSlot src={membership.profileImage} size="lg" />
        <div className="team-fields__icon-buttons">
          <Button variant="secondary" dense iconLeft={imageIcon} disabled={busy} onClick={() => fileRef.current?.click()}>
            사진 바꾸기
          </Button>
          {/* 팀 사진이 있으면 옆에 빨간 쓰레기통(지우면 계정 사진) */}
          {membership.profileImage && (
            <GlyphButton
              icon={trashIcon}
              label="팀 사진 지우기"
              className="glyph-button--danger"
              disabled={busy}
              onClick={() => run(() => deleteMyTeamImage(team.uuid), '사진을 지우지 못했어요.', '사진을 지웠어요')}
            />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) run(() => uploadMyTeamImage(team.uuid, file), '사진을 올리지 못했어요.', '사진을 바꿨어요');
            }}
          />
        </div>
      </div>
      <Input
        label="팀 프로필 이름"
        value={form.nickname}
        maxLength={50}
        placeholder="비우면 계정 이름"
        onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))}
      />
      <Input
        label="팀 이메일"
        type="email"
        value={form.email}
        maxLength={100}
        placeholder="구성원 목록에 보일 이메일(선택)"
        onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
      />
      <div className="modal__actions">
        <Button type="submit" disabled={busy}>
          저장
        </Button>
      </div>
    </form>
  );
}
