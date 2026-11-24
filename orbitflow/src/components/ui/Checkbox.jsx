import classNames from 'classnames';
import checkIcon from '../../assets/icons/check.svg';

// 상자 20px, 터치 영역은 최소 48px. 라벨 없이 쓰면 48×48 가운데 정렬(aria-label 필수)
// tone: action(파랑) · success(초록, 끝낸 할 일 표시). description은 라벨 아래 보조 문구
export function Checkbox({ label, description, tone = 'action', className, ...rest }) {
  return (
    <label className={classNames('checkbox', `checkbox--${tone}`, { 'checkbox--bare': !label }, className)}>
      <input type="checkbox" className="checkbox__input sr-only" {...rest} />
      <span className="checkbox__box" aria-hidden="true">
        <img src={checkIcon} alt="" />
      </span>
      {label && (
        <span className="checkbox__text">
          <span className="checkbox__label">{label}</span>
          {description && <span className="checkbox__desc">{description}</span>}
        </span>
      )}
    </label>
  );
}
