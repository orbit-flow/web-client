import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { Icon } from './Icon';
import clockIcon from '../../assets/icons/clock.svg';

// 한 줄 글자 칸을 input 대신 한 줄짜리 textarea로 그린다 — 크롬이 아무 글자 칸에나 비밀번호 · 아이디 제안을 띄우지 않게
// 줄바꿈은 막고(Enter는 input처럼 감싼 form 제출, 붙여 넣은 줄바꿈은 빈칸으로), 길면 옆으로 넘어간다
export function SingleLineInput({ className, onChange, onKeyDown, ...rest }) {
  return (
    <textarea
      rows={1}
      wrap="off"
      autoComplete="off"
      className={classNames(className, 'field__control--single')}
      onChange={(event) => {
        if (/[\r\n]/.test(event.target.value)) event.target.value = event.target.value.replace(/[\r\n]+/g, ' ');
        onChange?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.key !== 'Enter' || event.defaultPrevented || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }}
      {...rest}
    />
  );
}

// 글자 칸(type이 없거나 text · search)은 SingleLineInput. 로그인처럼 autoComplete를 정한 칸(비밀번호 관리자를 쓰는 칸)과
// 이메일 · 비밀번호 · 날짜 · 숫자 같은 형식 칸은 그대로 input
const SINGLE_LINE_TYPES = [undefined, 'text', 'search'];

// error: true면 테두리만 빨갛게, 문자열이면 hint 자리에 오류 문구까지
// iconLeft: 칸 안 왼쪽 아이콘(검색 칸 등)
export function Input({ label, hint, error, iconLeft, id, className, ...rest }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorMessage = typeof error === 'string' ? error : null;
  const message = errorMessage ?? hint;
  const singleLine = SINGLE_LINE_TYPES.includes(rest.type) && (rest.autoComplete == null || rest.autoComplete === 'off');

  const controlProps = {
    id: inputId,
    className: classNames('field__control', { 'field__control--error': error, 'field__control--icon': iconLeft }),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': message ? hintId : undefined,
  };
  const fieldRest = { ...rest };
  delete fieldRest.type;
  const input = singleLine ? <SingleLineInput {...controlProps} {...fieldRest} /> : <input {...controlProps} {...rest} />;

  return (
    <div className={classNames('field', className)}>
      {label && (
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {iconLeft ? (
        <div className="field__icon-wrap">
          <Icon src={iconLeft} size={18} className="field__icon" />
          {input}
        </div>
      ) : (
        input
      )}
      {message && (
        <p id={hintId} className={classNames('field__hint', { 'field__hint--error': errorMessage })}>
          {message}
        </p>
      )}
    </div>
  );
}

const pad = (n) => String(n).padStart(2, '0');
const PERIODS = [
  { value: 0, label: '오전' },
  { value: 1, label: '오후' },
];
const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => ({ value: h, label: String(h) }));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, m) => ({ value: m, label: pad(m) }));
// 고르기 창 높이(열 224 + 위아래 여백·테두리) — 아래 자리가 모자라면 위로 펼칠지 정할 때 쓴다
const PICKER_HEIGHT = 234;
const GAP = 4;

// "9" "930" "0930" "9:30" "21" → "HH:MM", 시각이 아니면 null
function parseTime(text) {
  const [h, m = ''] = text.includes(':')
    ? text.split(':')
    : text.length <= 2
      ? [text, '']
      : [text.slice(0, -2), text.slice(-2)];
  if (!/^\d{1,2}$/.test(h) || !/^\d{0,2}$/.test(m)) return null;
  const hour = Number(h);
  const minute = Number(m || 0);
  if (hour > 23 || minute > 59) return null;
  return `${pad(hour)}:${pad(minute)}`;
}

// 시각 칸. 칸에는 24시간("14:30")으로만 보이고 키보드로 바로 친다("1430"·"14:30"은 치는 즉시, "9"·"930"은 칸을 벗어날 때 맞춘다)
// 오른쪽 시계 아이콘을 누르면 아래에 고르기 창(오전/오후 · 시 · 분)이 뜬다. value·onChange는 "HH:MM"
// 고르기 창은 body에 띄운다(position: fixed) — 스크롤되는 모달 본문 안에서도 잘리지 않게
export function TimeInput({ label, value, onChange, error, className }) {
  const autoId = useId();
  const hintId = `${autoId}-hint`;
  const errorMessage = typeof error === 'string' ? error : null;
  const [draft, setDraft] = useState(null); // 치는 중인 글자(아직 시각이 아니면)
  const [position, setPosition] = useState(null);
  const fieldRef = useRef(null);
  const pickerRef = useRef(null);
  const open = position !== null;

  const [hour, minute] = value.split(':').map(Number);
  const period = hour < 12 ? 0 : 1;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const pick = ({ p = period, h = hour12, m = minute }) => onChange(`${pad((h % 12) + p * 12)}:${pad(m)}`);

  useEffect(() => {
    if (!open) return;
    const inside = (target) => fieldRef.current?.contains(target) || pickerRef.current?.contains(target);
    const closeOnOutside = (event) => !inside(event.target) && setPosition(null);
    // 창 안 열 스크롤은 그대로, 바깥 화면이 움직이면 칸과 떨어지므로 닫는다
    const closeOnScroll = (event) => !pickerRef.current?.contains(event.target) && setPosition(null);
    const closeNow = () => setPosition(null);
    // Esc는 고르기 창만 닫는다(감싼 모달까지 닫히지 않게 먼저 받아 멈춘다)
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setPosition(null);
    };
    window.addEventListener('mousedown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape, true);
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeNow);
    return () => {
      window.removeEventListener('mousedown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape, true);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeNow);
    };
  }, [open]);

  // 열 때 고른 값이 각 열 가운데에 오게
  useLayoutEffect(() => {
    if (!open) return;
    for (const column of pickerRef.current.querySelectorAll('.time-picker__column')) {
      const selected = column.querySelector('[aria-selected="true"]');
      if (selected) column.scrollTop = selected.offsetTop - (column.clientHeight - selected.offsetHeight) / 2;
    }
  }, [open]);

  const commit = (text) => {
    const parsed = parseTime(text);
    if (parsed) onChange(parsed);
    setDraft(null);
  };

  const handleChange = (event) => {
    const text = event.target.value.replace(/[^\d:]/g, '').slice(0, 5);
    if (/^\d{4}$/.test(text) || /^\d{1,2}:\d{2}$/.test(text)) {
      const parsed = parseTime(text);
      if (parsed) {
        onChange(parsed);
        setDraft(null);
        return;
      }
    }
    setDraft(text);
  };

  const toggle = () => {
    if (open) {
      setPosition(null);
      return;
    }
    const rect = fieldRef.current.getBoundingClientRect();
    const upward = rect.bottom + GAP + PICKER_HEIGHT > window.innerHeight && rect.top > window.innerHeight - rect.bottom;
    setPosition(upward ? { bottom: window.innerHeight - rect.top + GAP, left: rect.left } : { top: rect.bottom + GAP, left: rect.left });
  };

  const column = (name, options, selectedValue, onPick) => (
    <ul className="time-picker__column" role="listbox" aria-label={name}>
      {options.map((option) => (
        <li key={option.value} role="none">
          <button
            type="button"
            role="option"
            aria-selected={option.value === selectedValue}
            className={classNames('time-picker__option num', { 'time-picker__option--selected': option.value === selectedValue })}
            onClick={() => onPick(option.value)}
          >
            {option.label}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={classNames('field', className)}>
      {label && (
        <label className="field__label" htmlFor={autoId}>
          {label}
        </label>
      )}
      <div className="time-input" ref={fieldRef}>
        <SingleLineInput
          id={autoId}
          inputMode="numeric"
          maxLength={5}
          placeholder="00:00"
          className={classNames('field__control time-input__control num', { 'field__control--error': error })}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorMessage ? hintId : undefined}
          value={draft ?? value}
          onChange={handleChange}
          onBlur={() => draft !== null && commit(draft)}
          onKeyDown={(event) => {
            // 치다 만 값은 먼저 맞추고, 저장은 한 번 더 Enter로
            if (event.key === 'Enter' && draft !== null) {
              event.preventDefault();
              commit(draft);
            }
          }}
        />
        <button
          type="button"
          className="time-input__clock"
          aria-label={`${label} 시각 고르기`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={toggle}
        >
          <Icon src={clockIcon} size={18} />
        </button>
      </div>
      {errorMessage && (
        <p id={hintId} className="field__hint field__hint--error">
          {errorMessage}
        </p>
      )}
      {open &&
        createPortal(
          <div ref={pickerRef} className="time-picker" role="dialog" aria-label={`${label} 시각 고르기`} style={position}>
            {column('오전/오후', PERIODS, period, (p) => pick({ p }))}
            {column('시', HOURS_12, hour12, (h) => pick({ h }))}
            {column('분', MINUTE_OPTIONS, minute, (m) => pick({ m }))}
          </div>,
          document.body,
        )}
    </div>
  );
}
