import { useId } from 'react';
import classNames from 'classnames';

// 여러 줄 입력. maxLength가 있으면 칸 안 아래에 "현재 / 최대" 글자 수를 보여 준다
export function Textarea({ label, value, maxLength, error, id, className, ...rest }) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const errorId = `${textareaId}-error`;
  const errorMessage = typeof error === 'string' ? error : null;

  return (
    <div className={classNames('field', 'field--textarea', className)}>
      {label && (
        <label className="field__label" htmlFor={textareaId}>
          {label}
        </label>
      )}
      <div className={classNames('field__box', { 'field__box--error': error })}>
        <textarea
          id={textareaId}
          className="field__textarea"
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorMessage ? errorId : undefined}
          {...rest}
        />
        {maxLength && (
          <span className="field__count num">
            {value.length} / {maxLength}
          </span>
        )}
      </div>
      {errorMessage && (
        <p id={errorId} className="field__hint field__hint--error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
