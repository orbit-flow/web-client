import { useRef, useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { deleteProfileImage, updateMe, uploadProfileImage } from '../../api/user';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Button } from '../ui/Button';
import { GlyphButton } from '../ui/GlyphButton';
import { UnsavedChangesGuard } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { showErrorToast } from '../../utils/errorToast';
import { validateNickname } from '../../utils/validation';
import imageIcon from '../../assets/icons/image.svg';
import trashIcon from '../../assets/icons/trash.svg';
import { useToast } from '../../hooks/useRealtime';

// 설정 · 프로필: 사진(바꾸기·기본 이미지) + 이름 + 소개. 저장은 공개 설정 값도 함께 보낸다(PATCH가 네 필드 전부를 받음)
export function ProfileSection({ me, onChanged }) {
  const toast = useToast();
  const [form, setForm] = useState({ nickname: me.nickname, introduce: me.introduce ?? '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  // 바꾼 닉네임·소개가 있을 때만 저장할 수 있고, 저장 안 하고 나가면 묻는다(사진은 고르는 즉시 저장돼 해당 없음)
  const dirty = form.nickname !== me.nickname || form.introduce !== (me.introduce ?? '');

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
      onChanged();
      return true;
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const nicknameError = validateNickname(form.nickname);
    if (nicknameError) nextErrors.nickname = nicknameError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const ok = await run(
      () =>
        updateMe({
          nickname: form.nickname.trim(),
          introduce: form.introduce.trim() || null,
          isPrivate: me.isPrivate,
          allowNonFollowChatInvite: me.allowNonFollowChatInvite,
        }),
      '프로필을 저장하지 못했어요.',
    );
    if (ok) toast('프로필을 저장했어요');
  };

  return (
    <>
      <form id="settings-profile" className="card settings-card" onSubmit={handleSubmit}>
        <h2 className="settings-card__heading">프로필</h2>
        <div className="team-fields__icon">
          <AvatarSlot src={me.profileImage} size="xl" />
          <div className="team-fields__icon-actions">
            <div className="team-fields__icon-buttons">
              <Button variant="secondary" size="md" iconLeft={imageIcon} disabled={busy} onClick={() => fileRef.current?.click()}>
                사진 변경
              </Button>
              {/* 사진이 있으면 옆에 빨간 쓰레기통(지우면 기본 이미지) */}
              {me.profileImage && (
                <GlyphButton
                  icon={trashIcon}
                  label="사진 지우기"
                  className="glyph-button--danger"
                  disabled={busy}
                  onClick={() => run(deleteProfileImage, '사진을 지우지 못했어요.')}
                />
              )}
            </div>
            <span className="team-fields__hint">JPG · PNG · WEBP · GIF, 10MB 이하</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) run(() => uploadProfileImage(file), '사진을 올리지 못했어요.');
              }}
            />
          </div>
        </div>
        <Input
          label="닉네임"
          value={form.nickname}
          maxLength={50}
          hint="2~50자"
          error={errors.nickname}
          onChange={(event) => setForm((prev) => ({ ...prev, nickname: event.target.value }))}
        />
        <Textarea
          label="소개"
          value={form.introduce}
          maxLength={100}
          placeholder="나를 한 줄로 소개해 주세요"
          error={errors.introduce}
          onChange={(event) => setForm((prev) => ({ ...prev, introduce: event.target.value }))}
        />
        <div className="modal__actions">
          <Button type="submit" size="md" disabled={busy || !dirty}>
            저장
          </Button>
        </div>
      </form>
      <UnsavedChangesGuard when={dirty} />
    </>
  );
}
