import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EMAIL_CODE_TTL_MS, login, sendEmailCode, signup, verifyEmailCode } from '../api/auth';
import { getErrorMessage } from '../api/axios';
import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { AuthStepHeader } from '../components/auth/AuthStepHeader';
import { AuthTitle } from '../components/auth/AuthTitle';
import { CodeTimer } from '../components/auth/CodeTimer';
import { OtpInput } from '../components/auth/OtpInput';
import { TermsAgreement } from '../components/auth/TermsAgreement';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useCountdown } from '../hooks/useCountdown';
import { showErrorToast } from '../utils/errorToast';
import { PASSWORD_HINT, validateNickname, validatePassword } from '../utils/validation';

const CODE_LENGTH = 6;

// 이메일 입력 → 인증 코드 → 계정 정보 3단계를 한 페이지에서 바꿔 보여 준다
export function SignupPage() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [codeExpiresAt, setCodeExpiresAt] = useState(0);
  const [emailVerifyToken, setEmailVerifyToken] = useState(null);

  const handleCodeSent = (sentEmail) => {
    setEmail(sentEmail);
    setCodeExpiresAt(Date.now() + EMAIL_CODE_TTL_MS);
    setStep('code');
  };

  const restart = () => {
    setEmailVerifyToken(null);
    setStep('email');
  };

  if (step === 'code') {
    return (
      <CodeStep
        email={email}
        expiresAt={codeExpiresAt}
        onResent={() => setCodeExpiresAt(Date.now() + EMAIL_CODE_TTL_MS)}
        onBack={restart}
        onVerified={(token) => {
          setEmailVerifyToken(token);
          setStep('account');
        }}
      />
    );
  }

  if (step === 'account') {
    return <AccountStep email={email} emailVerifyToken={emailVerifyToken} onBack={restart} />;
  }

  return <EmailStep initialEmail={email} onSent={handleCodeSent} />;
}

function EmailStep({ initialEmail, onSent }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = email.trim();
    setError(null);
    setSubmitting(true);
    try {
      await sendEmailCode(trimmed);
      onSent(trimmed);
    } catch (err) {
      setError(getErrorMessage(err, '인증 코드를 보내지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthModal busy={submitting}>
      <AuthModalHeader />
      <AuthStepHeader step={1} label="이메일 인증" />
      <AuthTitle title="이메일을 입력해 주세요" description="가입할 이메일로 6자리 인증 코드를 보내 드려요." />

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
          인증 코드 받기
        </Button>
      </form>

      <p className="auth-footer auth-footer--inline">
        이미 계정이 있나요?
        <Link className="auth-footer__link auth-footer__link--accent" to="/login">
          로그인
        </Link>
      </p>
    </AuthModal>
  );
}

function CodeStep({ email, expiresAt, onResent, onBack, onVerified }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const remaining = useCountdown(expiresAt);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (remaining === 0) {
      setError('코드가 만료됐어요. 다시 보내 주세요.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const token = await verifyEmailCode({ email, code });
      onVerified(token);
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
      onResent();
    } catch (err) {
      setError(getErrorMessage(err, '코드를 다시 보내지 못했어요. 잠시 후 다시 시도해 주세요.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthModal busy={submitting}>
      <AuthModalHeader onBack={onBack} />
      <AuthStepHeader step={1} label="이메일 인증" />
      <AuthTitle
        title="인증 코드를 입력해 주세요"
        description={`${email}로 코드를 보냈어요.\n5분 안에 입력해 주세요.`}
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
          인증하기
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

function AccountStep({ email, emailVerifyToken, onBack }) {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = { ...validatePassword(password, passwordConfirm) };
    const nicknameError = validateNickname(nickname);
    if (nicknameError) nextErrors.nickname = nicknameError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await signup({ email, password, nickname: nickname.trim(), emailVerifyToken, termsAgreed });
    } catch (err) {
      showErrorToast(getErrorMessage(err, '가입하지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setSubmitting(false);
      return;
    }

    // 가입은 토큰을 주지 않으므로 바로 로그인해 온보딩으로 보낸다. 실패하면 로그인 화면에서 다시
    try {
      await login({ email, password });
      navigate('/onboarding', { replace: true });
    } catch {
      navigate('/login', { replace: true, state: { email } });
    }
  };

  return (
    <AuthModal busy={submitting}>
      <AuthModalHeader onBack={onBack} />
      <AuthStepHeader step={2} label="계정 정보" />
      <AuthTitle
        title="계정 정보를 입력해 주세요"
        description={'이름은 다른 사람에게 보이는 이름이에요.\n가입 후에도 바꿀 수 있어요.'}
      />

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-fields">
          <Input label="이메일" type="email" value={email} disabled readOnly hint="인증된 이메일이에요" />
          <Input
            label="이름"
            name="nickname"
            autoComplete="nickname"
            placeholder="이름 입력"
            maxLength={50}
            autoFocus
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            hint="2~50자"
            error={errors.nickname}
          />
          <Input
            label="비밀번호"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="비밀번호 입력"
            maxLength={20}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint={PASSWORD_HINT}
            error={errors.password}
          />
          <Input
            label="비밀번호 확인"
            type="password"
            name="passwordConfirm"
            autoComplete="new-password"
            placeholder="비밀번호 다시 입력"
            maxLength={20}
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            error={errors.passwordConfirm}
          />
        </div>

        <TermsAgreement checked={termsAgreed} onChange={setTermsAgreed} />

        <Button size="lg" type="submit" fullWidth disabled={!termsAgreed || submitting}>
          가입하기
        </Button>
      </form>
    </AuthModal>
  );
}
