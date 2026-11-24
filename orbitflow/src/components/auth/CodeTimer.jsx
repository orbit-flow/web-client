import classNames from 'classnames';

function formatRemaining(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// 인증 코드 남은 시간. remaining은 useCountdown이 주는 ms
export function CodeTimer({ remaining }) {
  return (
    <p className="auth-timer">
      남은 시간
      <span className={classNames('auth-timer__value', { 'auth-timer__value--expired': remaining === 0 })}>
        {formatRemaining(remaining)}
      </span>
    </p>
  );
}
