import classNames from 'classnames';

// 트랙 높이 6px. value/max 비율만큼 채운다. tone: action · level
export function ProgressBar({ value, max = 100, label, tone = 'action' }) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={classNames('progress', `progress--${tone}`)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
