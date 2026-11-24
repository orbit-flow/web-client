import { useId } from 'react';
import classNames from 'classnames';
import { Icon } from './Icon';
import chevronDownIcon from '../../assets/icons/chevron-down.svg';

// 네이티브 select + 오른쪽 chevron. options: [{ value, label }]
// error: Input과 같다 — true면 테두리만 빨갛게, 문자열이면 hint 자리에 오류 문구까지
export function Select({ label, hint, error, options, id, className, ...rest }) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hintId = `${selectId}-hint`;
  const errorMessage = typeof error === 'string' ? error : null;
  const message = errorMessage ?? hint;

  return (
    <div className={classNames('field', className)}>
      {label && (
        <label className="field__label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="select">
        <select
          id={selectId}
          className={classNames('field__control select__control', { 'field__control--error': error })}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? hintId : undefined}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon src={chevronDownIcon} size={16} className="select__chevron" />
      </div>
      {message && (
        <p id={hintId} className={classNames('field__hint', { 'field__hint--error': errorMessage })}>
          {message}
        </p>
      )}
    </div>
  );
}
