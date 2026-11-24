import { useRef } from 'react';
import classNames from 'classnames';

// 숫자 인증 코드 칸. value는 앞에서부터 채워진 숫자 문자열("381")
// 붙여넣기·자동완성(one-time-code)이면 여러 칸을 한 번에 채운다
export function OtpInput({ value, onChange, length = 6, error = false, disabled = false, autoFocus = false }) {
  const cellRefs = useRef([]);
  // 코드가 옮기는 포커스인지. 이때는 value가 아직 갱신 전이라 handleFocus의 빈칸 검사를 건너뛴다
  const movingFocusRef = useRef(false);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusCell = (index) => {
    movingFocusRef.current = true;
    cellRefs.current[Math.max(0, Math.min(index, length - 1))]?.focus();
    movingFocusRef.current = false;
  };

  const fillFrom = (index, input) => {
    const next = (value.slice(0, index) + input + value.slice(index + input.length)).slice(0, length);
    onChange(next);
    focusCell(index + input.length);
  };

  const handleChange = (index, event) => {
    const input = event.target.value.replace(/\D/g, '');
    if (input) {
      fillFrom(index, input);
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusCell(index - 1);
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusCell(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusCell(Math.min(index + 1, value.length));
    }
  };

  const handlePaste = (index, event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (pasted) {
      fillFrom(index, pasted);
    }
  };

  // 빈칸을 건너뛰고 뒤 칸에 입력하지 않도록, 첫 빈칸보다 뒤를 누르면 첫 빈칸으로 보낸다
  const handleFocus = (index, event) => {
    if (!movingFocusRef.current && index > value.length) {
      focusCell(value.length);
      return;
    }
    event.target.select();
  };

  return (
    <div className="otp" role="group" aria-label={`인증 코드 ${length}자리`}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            cellRefs.current[index] = el;
          }}
          className={classNames('otp__cell', { 'otp__cell--error': error })}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`${index + 1}번째 자리`}
          aria-invalid={error ? true : undefined}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => handleFocus(index, event)}
        />
      ))}
    </div>
  );
}
