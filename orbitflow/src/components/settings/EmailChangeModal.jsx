import { useState } from 'react';
import { EMAIL_CODE_TTL_MS, sendEmailCode, verifyEmailCode } from '../../api/auth';
import { getErrorMessage } from '../../api/axios';
import { changeEmail } from '../../api/user';
import { useCountdown } from '../../hooks/useCountdown';
import { showErrorToast } from '../../utils/errorToast';
import { CodeTimer } from '../auth/CodeTimer';
import { OtpInput } from '../auth/OtpInput';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import closeIcon from '../../assets/icons/close.svg';

const CODE_LENGTH = 6;

// 이메일 변경(폭 400): 새 이메일로 코드 받기 → 6자리 입력 → 인증 토큰으로 변경
export function EmailChangeModal({ onClose, onChanged }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [busy, setBusy] = useState(false);
  // 실패하면 코드 칸을 빨갛게
  const [failed, setFailed] = useState(false);
  const remaining = useCountdown(expiresAt);
  const sent = expiresAt != null;

  const sendCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFailed(true);
      showErrorToast('이메일 형식으로 입력해 주세요');
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      await sendEmailCode(email.trim());
      setCode('');
      setExpiresAt(Date.now() + EMAIL_CODE_TTL_MS);
    } catch (err) {
      setFailed(true);
      showErrorToast(getErrorMessage(err, '코드를 보내지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!sent) {
      sendCode();
      return;
    }
    if (remaining === 0) {
      setFailed(true);
      showErrorToast('코드가 만료됐어요. 다시 받아 주세요.');
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const emailVerifyToken = await verifyEmailCode({ email: email.trim(), code });
      await changeEmail({ email: email.trim(), emailVerifyToken });
      onChanged();
    } catch (err) {
      setFailed(true);
      showErrorToast(getErrorMessage(err, '이메일을 바꾸지 못했어요.'));
      setBusy(false);
    }
  };

  return (
    <Modal busy={busy} label="이메일 변경" className="modal--form account-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">이메일 변경</h2>
          <p className="modal__subtitle">새 이메일로 받은 6자리 코드를 입력해 주세요</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>
      <form className="modal__form account-modal__form" onSubmit={handleSubmit}>
        <Input
          label="새 이메일"
          type="email"
          value={email}
          placeholder="name@example.com"
          autoFocus
          onChange={(event) => {
            setEmail(event.target.value);
            setExpiresAt(null);
          }}
        />
        <div>
          <Button variant={sent ? 'ghost' : 'secondary'} dense disabled={busy} onClick={sendCode}>
            {sent ? '코드 다시 받기' : '코드 받기'}
          </Button>
        </div>
        {sent && (
          <>
            <OtpInput value={code} onChange={setCode} length={CODE_LENGTH} error={failed} autoFocus />
            <CodeTimer remaining={remaining} />
          </>
        )}
        <div className="modal__actions">
          <Button variant="neutral" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" disabled={busy || (sent && code.length < CODE_LENGTH)}>
            변경하기
          </Button>
        </div>
      </form>
    </Modal>
  );
}
