import classNames from 'classnames';

// icon은 피그마에서 48×48 버튼 모양(배경·테두리 포함) 그대로 내보낸 SVG
// label은 화면에 보이지 않으므로 필수(aria-label)
export function IconButton({ icon, label, type = 'button', className, ...rest }) {
  return (
    <button type={type} className={classNames('icon-button', className)} aria-label={label} {...rest}>
      <img src={icon} alt="" />
    </button>
  );
}
