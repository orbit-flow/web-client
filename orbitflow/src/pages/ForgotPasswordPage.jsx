import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetMail } from '../api/auth';
import { getErrorMessage } from '../api/axios';
import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { AuthTitle } from '../components/auth/AuthTitle';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { showErrorToast } from '../utils/errorToast';

// 비밀번호 찾기: 이메일 입력 → 재설정 링크 메일 보냄. 링크는 /reset-password?token=...
export function ForgotPasswordPage() {
  const [sentEmail, setSentEmail] = useState(null);

  if (sentEmail) {
    return <MailSentStep email={sentEmail} />;
  }
  return <EmailStep onSent={setSentEmail} />;
}

function EmailStep({ onSent }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = email.trim();
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordResetMail(trimmed);
      onSent(trimmed);
    } catch (err) {
      setError(getErrorMessage(err, '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthModal busy={submitting}>
      <AuthModalHeader />
      <AuthTitle title="비밀번호를 잊으셨나요?" description="가입한 이메일로 비밀번호 재설정 링크를 보내 드려요." />

      <form className="auth-form" onSubmit={handleSubmit}>
        <Input
          label="이메일"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="name@example.com"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error ?? undefined}
        />
        <Button size="lg" type="submit" fullWidth disabled={submitting}>
          재설정 링크 받기
        </Button>
      </form>

      <p className="auth-footer auth-footer--inline">
        비밀번호가 생각났나요?
        <Link className="auth-footer__link auth-footer__link--accent" to="/login">
          로그인
        </Link>
      </p>
    </AuthModal>
  );
}

function MailSentStep({ email }) {
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [resending, setResending] = useState(false);

  // 같은 이메일로 1분에 1번만 보낼 수 있다(429)
  const handleResend = async () => {
    setNotice(null);
    setResending(true);
    try {
      await sendPasswordResetMail(email);
      setNotice('메일을 다시 보냈어요.');
    } catch (err) {
      showErrorToast(getErrorMessage(err, '메일을 다시 보내지 못했어요.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthModal busy={resending}>
      <AuthModalHeader />
      <AuthTitle
        title="메일을 보냈어요"
        description={`${email} 으로 재설정 링크를 보냈어요. 메일의 링크를 누르면 새 비밀번호를 정하는 화면으로 이동해요. 링크는 30분 동안 쓸 수 있어요.`}
      />
      <div className="auth-form">
        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}
        <Button size="lg" fullWidth onClick={() => navigate('/login', { state: { email } })}>
          로그인하러 가기
        </Button>
      </div>

      <p className="auth-footer auth-footer--inline">
        메일이 오지 않았나요?
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
