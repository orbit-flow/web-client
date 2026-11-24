import { useId } from 'react';
import classNames from 'classnames';
import { SingleLineInput } from './Input';
import { normalizeHex } from '../../utils/color';

const FALLBACK = '#9CA1AB'; // --neutral-400

// 브라우저 기본 색 고르기(팔레트). 감싼 칸 전체가 누르는 곳이 된다
function PalettePicker({ hex, onChange }) {
  return (
    <input
      type="color"
      className="color-picker"
      value={(hex ?? FALLBACK).toLowerCase()}
      onChange={(event) => onChange(event.target.value.toUpperCase())}
      aria-label="팔레트에서 색 고르기"
    />
  );
}

// 색 입력 칸: 왼쪽 색 칸을 누르면 팔레트가 열리고, 오른쪽에는 HEX를 직접 쓴다.
// value: "#RRGGBB"(쓰는 중에는 미완성 문자열일 수 있음), onChange(value). error는 Input과 같다
export function ColorField({ label = '색상 (HEX)', value, onChange, hint, error, className }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const hex = normalizeHex(value);
  const errorMessage = typeof error === 'string' ? error : null;
  const message = errorMessage ?? hint;

  return (
    <div className={classNames('field', className)}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="color-field">
        <span className="color-field__chip" style={{ backgroundColor: hex ?? FALLBACK }} title="팔레트에서 고르기">
          <PalettePicker hex={hex} onChange={onChange} />
        </span>
        <SingleLineInput
          id={id}
          className={classNames('field__control color-field__hex', { 'field__control--error': error })}
          value={value}
          maxLength={7}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {message && (
        <p id={hintId} className={classNames('field__hint', { 'field__hint--error': errorMessage })}>
          {message}
        </p>
      )}
    </div>
  );
}

// 추천 색 동그라미. colors: '#' 없는 6자리 hex 목록.
// withPicker면 맨 끝에 팔레트 동그라미를 붙인다(HEX 칸 없이 색만 고르는 곳). 추천 밖의 색을 고르면 그 색으로 칠해진다
export function ColorSwatches({ label, colors, value, onChange, withPicker = false }) {
  const hex = normalizeHex(value);
  const custom = hex !== null && !colors.includes(hex.slice(1));

  return (
    <div className="swatches">
      {label && <span className="swatches__label">{label}</span>}
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={classNames('swatches__item', { 'swatches__item--selected': hex === `#${color}` })}
          style={{ backgroundColor: `#${color}` }}
          aria-label={`#${color}`}
          aria-pressed={hex === `#${color}`}
          onClick={() => onChange(`#${color}`)}
        />
      ))}
      {withPicker && (
        <span
          className={classNames('swatches__item swatches__palette', { 'swatches__item--selected': custom })}
          style={custom ? { background: hex } : undefined}
          title="팔레트에서 고르기"
        >
          <PalettePicker hex={hex} onChange={onChange} />
        </span>
      )}
    </div>
  );
}
