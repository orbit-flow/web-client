import classNames from 'classnames';
import { Icon } from './Icon';

// variant: primary · secondary(외곽선) · neutral · ghost / size: sm 32 · md 40(기본) · lg 48(로그인·가입 화면)
// dense: 높이는 그대로 두고 글자 16px·좌우 16px(피그마 "Label/Button MD"를 48 높이에 쓴 버튼)
// iconLeft 아이콘은 글자색을 따른다
export function Button({
  variant = 'primary',
  size = 'md',
  dense = false,
  fullWidth = false,
  iconLeft,
  type = 'button',
  className,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      className={classNames('btn', `btn--${variant}`, `btn--${size}`, { 'btn--full': fullWidth, 'btn--dense': dense }, className)}
      {...rest}
    >
      {iconLeft && <Icon src={iconLeft} size={size === 'lg' && !dense ? 20 : 18} />}
      {children}
    </button>
  );
}
