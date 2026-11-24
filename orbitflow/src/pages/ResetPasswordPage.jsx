import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { getErrorMessage } from '../api/axios';
import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { AuthTitle } from '../components/auth/AuthTitle';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { showErrorToast } from '../utils/errorToast';
import { PASSWORD_HINT, validatePassword } from '../utils/validation';

// 재설정 메일 링크(/reset-password?token=...)로 들어오는 화면
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validatePassword(password, passwordConfirm);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword: password });
      // 토큰을 주지 않고 모든 기기 세션을 끊으므로 새 비밀번호로 다시 로그인
      navigate('/login', { replace: true, state: { notice: '비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.' } });
    } catch (err) {
      // 링크 만료·재사용이면 400 INVALID_PASSWORD_RESET_TOKEN
      showErrorToast(getErrorMessage(err, '비밀번호를 바꾸지 못했어요. 메일을 다시 받아 주세요.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthModal busy={submitting}>
      <AuthModalHeader />
      <AuthTitle title="새 비밀번호를 정해 주세요" description="앞으로 쓸 비밀번호를 입력해 주세요." />

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-fields">
          <Input
            label="새 비밀번호"
            type="password"
            name="newPassword"
            autoComplete="new-password"
            placeholder="비밀번호 입력"
            maxLength={20}
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint={PASSWORD_HINT}
            error={errors.password}
          />
          <Input
            label="새 비밀번호 확인"
            type="password"
            name="newPasswordConfirm"
            autoComplete="new-password"
            placeholder="비밀번호 다시 입력"
            maxLength={20}
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            error={errors.passwordConfirm}
          />
        </div>
        <Button size="lg" type="submit" fullWidth disabled={submitting}>
          비밀번호 바꾸기
        </Button>
      </form>
    </AuthModal>
  );
}
