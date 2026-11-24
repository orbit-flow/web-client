import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { EMAIL_CODE_TTL_MS, releaseDormant, sendEmailCode } from '../api/auth';
import { getErrorMessage } from '../api/axios';
import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { AuthTitle } from '../components/auth/AuthTitle';
import { CodeTimer } from '../components/auth/CodeTimer';
import { OtpInput } from '../components/auth/OtpInput';
import { Button } from '../components/ui/Button';
import { useCountdown } from '../hooks/useCountdown';

const CODE_LENGTH = 6;

// 로그인이 403 ACCOUNT_DORMANT일 때 로그인 화면이 코드를 보낸 뒤 state { email, expiresAt, sendError? }로 넘어온다
export function DormantPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email = state?.email;

  const [expiresAt, setExpiresAt] = useState(state?.expiresAt ?? 0);
  const [code, setCode] = useState('');
  const [error, setError] = useState(state?.sendError ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const remaining = useCountdown(expiresAt);

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (remaining === 0) {
      setError('코드가 만료됐어요. 다시 보내 주세요.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await releaseDormant({ email, code });
      // 해제는 토큰을 주지 않으므로 다시 로그인
      navigate('/login', { replace: true, state: { email, notice: '휴면이 풀렸어요. 다시 로그인해 주세요.' } });
    } catch (err) {
      setError(getErrorMessage(err, '인증하지 못했어요. 코드를 다시 확인해 주세요.'));
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResending(true);
    try {
      await sendEmailCode(email);
      setCode('');
      setExpiresAt(Date.now() + EMAIL_CODE_TTL_MS);
    } catch (err) {
      setError(getErrorMessage(err, '코드를 다시 보내지 못했어요. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthModal busy={submitting}>
      <AuthModalHeader onBack={() => navigate('/login', { state: { email } })} />
      <AuthTitle
        title="다시 오신 걸 환영해요"
        description={`6개월 동안 로그인하지 않아 휴면 계정이 되었어요. ${email} 으로 보낸 6자리 코드를 입력하면 다시 쓸 수 있어요.`}
      />

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-code">
          <OtpInput value={code} onChange={setCode} length={CODE_LENGTH} error={Boolean(error)} autoFocus />
          <CodeTimer remaining={remaining} />
          {error && (
            <p className="field__hint field__hint--error" role="alert">
              {error}
            </p>
          )}
        </div>
        <Button size="lg" type="submit" fullWidth disabled={code.length < CODE_LENGTH || submitting}>
          인증하고 계속하기
        </Button>
      </form>

      <p className="auth-footer auth-footer--inline">
        코드가 안 왔나요?
        <button
          type="button"
          className="auth-footer__link auth-footer__link--accent"
          onClick={handleResend}
          disabled={resending}
        >
          다시 보내기
        </button>
      </p>
    </AuthModal>
  );
}
