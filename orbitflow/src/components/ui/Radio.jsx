import classNames from 'classnames';

// 원 20px, 선택 시 6px 테두리. description은 라벨 아래 보조 문구
export function Radio({ label, description, className, ...rest }) {
  return (
    <label className={classNames('radio', className)}>
      <input type="radio" className="radio__input sr-only" {...rest} />
      <span className="radio__control" aria-hidden="true" />
      <span className="radio__text">
        <span className="radio__label">{label}</span>
        {description && <span className="radio__desc">{description}</span>}
      </span>
    </label>
  );
}
