import { useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { changePassword, setPassword } from '../../api/user';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { showErrorToast } from '../../utils/errorToast';
import { PASSWORD_HINT, validatePassword } from '../../utils/validation';
import closeIcon from '../../assets/icons/close.svg';

// 비밀번호 변경(폭 400). 소셜 전용 계정(hasPassword: false)이면 현재 비밀번호 없이 "설정"
export function PasswordModal({ hasPassword, onClose, onChanged }) {
  const [form, setForm] = useState({ password: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const checked = validatePassword(form.newPassword, form.confirm);
    const nextErrors = { newPassword: checked.password, confirm: checked.passwordConfirm };
    if (hasPassword && !form.password) nextErrors.password = '지금 비밀번호를 입력해 주세요';
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setBusy(true);
    try {
      if (hasPassword) await changePassword({ password: form.password, newPassword: form.newPassword });
      else await setPassword(form.newPassword);
      onChanged();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '비밀번호를 바꾸지 못했어요.'));
      setBusy(false);
    }
  };

  const title = hasPassword ? '비밀번호 변경' : '비밀번호 설정';

  return (
    <Modal busy={busy} label={title} className="modal--form account-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">{title}</h2>
          <p className="modal__subtitle">
            {hasPassword ? '지금 비밀번호를 먼저 확인해요' : '설정하면 이메일·비밀번호로도 로그인할 수 있어요'}
          </p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>
      <form className="modal__form account-modal__form" onSubmit={handleSubmit}>
        {hasPassword && (
          <Input label="현재 비밀번호" type="password" autoComplete="current-password" value={form.password} error={errors.password} onChange={set('password')} autoFocus />
        )}
        <Input
          label="새 비밀번호"
          type="password"
          autoComplete="new-password"
          value={form.newPassword}
          hint={PASSWORD_HINT}
          error={errors.newPassword}
          onChange={set('newPassword')}
          autoFocus={!hasPassword}
        />
        <Input label="새 비밀번호 확인" type="password" autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={set('confirm')} />
        {hasPassword && <p className="field__hint">바꾸면 다른 기기에서는 로그아웃돼요</p>}
        <div className="modal__actions">
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={busy}>
            {hasPassword ? '변경하기' : '설정하기'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
