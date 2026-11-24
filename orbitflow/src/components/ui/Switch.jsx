import classNames from 'classnames';

// 트랙 44×26 + 손잡이 20. 터치 영역은 라벨까지 최소 48px
export function Switch({ label, className, ...rest }) {
  return (
    <label className={classNames('switch', className)}>
      <input type="checkbox" role="switch" className="switch__input sr-only" {...rest} />
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      {label && <span className="switch__label">{label}</span>}
    </label>
  );
}
