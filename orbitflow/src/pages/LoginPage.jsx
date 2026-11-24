import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearPendingOAuthProvider, EMAIL_CODE_TTL_MS, login, sendEmailCode } from '../api/auth';
import { getErrorMessage } from '../api/axios';
import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { AuthTitle } from '../components/auth/AuthTitle';
import { OrDivider } from '../components/auth/OrDivider';
import { SocialButtons } from '../components/auth/SocialButtons';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { showErrorToast } from '../utils/errorToast';

// 없는 계정·비밀번호 불일치·탈퇴 계정은 서버가 모두 같은 400 LOGIN_FAIL로 준다
const LOGIN_FAIL_MESSAGE = '이메일 또는 비밀번호가 맞지 않아요';

// 소셜 로그인이 실패하면 서버가 /login?error={값}으로 돌려보낸다
const OAUTH_ERROR_MESSAGES = {
  email_already_registered: '이미 이메일로 가입된 계정이에요. 이메일로 로그인해 주세요.',
  account_dormant: '휴면 계정이에요. 이메일로 로그인해 휴면을 해제해 주세요.',
  email_not_provided: '소셜 계정에서 이메일을 받지 못했어요.',
  email_not_verified: '소셜 계정의 이메일이 인증되지 않았어요.',
  access_denied: '소셜 로그인을 취소했어요.',
};
const OAUTH_ERROR_FALLBACK = '소셜 로그인에 실패했어요. 다시 시도해 주세요.';

// state { email?, notice?, from? }: 다른 화면(휴면 해제·비밀번호 재설정 등)에서 넘어올 때 이메일과 안내 문구,
// 로그인이 필요한 화면에서 막혀 왔으면 그 경로(from)
export function LoginPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const oauthError = searchParams.get('error');

  const [email, setEmail] = useState(state?.email ?? '');
  const [password, setPassword] = useState('');
  // 실패하면 두 칸을 빨간 테두리로(문구는 오류 토스트로)
  const [failed, setFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 소셜 로그인이 실패해 돌아왔으면 "로그인 마무리 대기" 표시를 지우고 실패 이유를 띄운다
  useEffect(() => {
    if (!oauthError) return;
    clearPendingOAuthProvider();
    showErrorToast(OAUTH_ERROR_MESSAGES[oauthError] ?? OAUTH_ERROR_FALLBACK);
  }, [oauthError]);

  // 휴면 해제 화면은 코드가 이미 간 상태를 전제로 하므로 여기서 먼저 보낸다
  const goToDormant = async (trimmedEmail) => {
    let next = { email: trimmedEmail, expiresAt: Date.now() + EMAIL_CODE_TTL_MS };
    try {
      await sendEmailCode(trimmedEmail);
    } catch (err) {
      next = { email: trimmedEmail, expiresAt: 0, sendError: getErrorMessage(err, '인증 코드를 보내지 못했어요.') };
    }
    navigate('/dormant', { state: next });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFailed(false);
    setSubmitting(true);
    try {
      const result = await login({ email, password });
      if (result.suspended) {
        navigate('/suspended', { state: { suspension: result.suspension } });
        return;
      }
      // 로그인이 필요한 화면에서 넘어왔으면 그 화면으로
      navigate(state?.from ?? '/home', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        // 로그인의 403은 ACCOUNT_DORMANT(6개월 미접속)뿐이다
        await goToDormant(email.trim().toLowerCase());
        return;
      }
      setFailed(true);
      showErrorToast(
        status === 400 ? LOGIN_FAIL_MESSAGE : getErrorMessage(err, '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthModal busy={submitting}>
      <AuthModalHeader />
      <AuthTitle title="다시 만나서 반가워요" description="이메일로 로그인하거나 소셜 계정으로 계속하세요." />

      {state?.notice && (
        <p className="auth-notice" role="status">
          {state.notice}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-fields">
          <Input
            label="이메일"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="name@example.com"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={failed}
          />
          <Input
            label="비밀번호"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="비밀번호 입력"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={failed}
          />
        </div>
        <Button size="lg" type="submit" fullWidth disabled={submitting}>
          로그인
        </Button>
      </form>

      <OrDivider />

      <SocialButtons />

      <nav className="auth-footer">
        <Link className="auth-footer__link" to="/signup">
          회원가입
        </Link>
        <span className="auth-footer__sep" aria-hidden="true">
          |
        </span>
        <Link className="auth-footer__link" to="/forgot-password">
          비밀번호 찾기
        </Link>
      </nav>
    </AuthModal>
  );
}
