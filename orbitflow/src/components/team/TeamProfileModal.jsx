import { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Button } from '../ui/Button';
import { GlyphButton } from '../ui/GlyphButton';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { showErrorToast } from '../../utils/errorToast';
import closeIcon from '../../assets/icons/close.svg';
import imageIcon from '../../assets/icons/image.svg';
import trashIcon from '../../assets/icons/trash.svg';

const COPY = {
  request: { title: '가입 신청', submit: '신청하기', fail: '가입을 신청하지 못했어요.' },
  accept: { title: '초대 수락', submit: '수락하기', fail: '초대를 수락하지 못했어요.' },
};

// 팀 프로필 입력 칸: 사진(고르기 · 빼기) · 이름 · 이메일. 가입 신청 · 초대 수락 · 팀 만들기(오너) 공통
// form: { nickname, email }, image: 고른 파일(없으면 계정 사진). nicknameLabel로 필수 · 선택 문구를 바꾼다
export function TeamProfileFields({ form, onChange, image, onImageChange, nicknameError, nicknameLabel = '팀 프로필 이름', disabled = false }) {
  const fileRef = useRef(null);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  return (
    <>
      <div className="team-fields__icon">
        <AvatarSlot src={preview} size="lg" />
        <div className="team-fields__icon-actions">
          <div className="team-fields__icon-buttons">
            <Button variant="secondary" size="md" iconLeft={imageIcon} disabled={disabled} onClick={() => fileRef.current?.click()}>
              {image ? '사진 바꾸기' : '사진 고르기'}
            </Button>
            {/* 고른 사진이 있으면 옆에 빨간 쓰레기통(빼면 계정 사진) */}
            {image && (
              <GlyphButton icon={trashIcon} label="사진 빼기" className="glyph-button--danger" disabled={disabled} onClick={() => onImageChange(null)} />
            )}
          </div>
          <span className="team-fields__hint">JPG · PNG · WEBP · GIF, 10MB 이하 · 고르지 않으면 계정 사진이 보여요</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onImageChange(file);
          }}
        />
      </div>
      <Input
        label={nicknameLabel}
        value={form.nickname}
        maxLength={50}
        placeholder="팀 안에서 불릴 이름"
        error={nicknameError}
        onChange={(event) => onChange({ ...form, nickname: event.target.value })}
      />
      <Input
        label="팀 이메일 (선택)"
        type="email"
        value={form.email}
        maxLength={100}
        placeholder="구성원 목록에 보일 이메일"
        onChange={(event) => onChange({ ...form, email: event.target.value })}
      />
    </>
  );
}

// 팀에 들어갈 때 쓸 팀 프로필(가입 신청 · 초대 수락 공통). 팀 안에서는 개인 프로필 대신 이 프로필이 보인다
// mode: 'request' | 'accept'. onSubmit({ nickname, email }, image) — 성공하면 호출 측이 닫고, 실패하면 여기서 오류를 띄운다
export function TeamProfileModal({ teamName, mode, onClose, onSubmit }) {
  const copy = COPY[mode];
  const [form, setForm] = useState({ nickname: '', email: '' });
  const [image, setImage] = useState(null);
  const [nicknameError, setNicknameError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nickname = form.nickname.trim();
    setNicknameError(nickname ? null : '팀에서 쓸 이름을 입력해 주세요');
    if (!nickname) return;
    setSaving(true);
    try {
      await onSubmit({ nickname, email: form.email.trim() || null }, image);
    } catch (err) {
      showErrorToast(getErrorMessage(err, copy.fail));
      setSaving(false);
    }
  };

  return (
    <Modal busy={saving} label={copy.title} className="modal--form team-form-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">{copy.title}</h2>
          <p className="modal__subtitle">{teamName} 팀에서 쓸 프로필이에요. 팀 안에서는 이 프로필이 보여요</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>
      <form className="modal__form team-form-modal__form" onSubmit={handleSubmit}>
        <TeamProfileFields form={form} onChange={setForm} image={image} onImageChange={setImage} nicknameError={nicknameError} disabled={saving} />
        <div className="modal__actions">
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            {copy.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
