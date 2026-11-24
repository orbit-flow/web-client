import classNames from 'classnames';
import { Icon } from './Icon';

// 배경 없는 48×48 아이콘 버튼. icon은 글리프(currentColor로 다시 칠함), label은 aria-label
export function GlyphButton({ icon, label, size = 20, type = 'button', className, ...rest }) {
  return (
    <button type={type} className={classNames('glyph-button', className)} aria-label={label} {...rest}>
      <Icon src={icon} size={size} />
    </button>
  );
}
