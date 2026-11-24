import { ProgressBar } from '../ui/ProgressBar';

// 회원가입 단계 표시: "1 / 2 · 이메일 인증" + 진행 막대
export function AuthStepHeader({ step, total = 2, label }) {
  return (
    <div className="auth-step">
      <p className="auth-step__label">
        {step} / {total} · {label}
      </p>
      <ProgressBar value={step} max={total} label="가입 진행" />
    </div>
  );
}
