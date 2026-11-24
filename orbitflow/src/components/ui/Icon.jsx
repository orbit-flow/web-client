import classNames from 'classnames';

// 피그마 MingCute 아이콘 SVG를 마스크로 써서 글자색(currentColor)으로 칠한다 — 상태마다 색을 바꾸기 위해
export function Icon({ src, size = 24, className }) {
  return (
    <span
      className={classNames('icon', className)}
      style={{ '--icon-src': `url("${src}")`, width: size, height: size }}
      aria-hidden="true"
    />
  );
}

// 비어 있을 때 안내(채팅방 · 카테고리 · 일정 · 백로그 · 게시글 등 공통): 가운데 파란 원 아이콘 + 문구 + 설명 · 버튼(children)
export function EmptyHint({ icon, title, description, children }) {
  return (
    <div className="empty-hint">
      <span className="empty-hint__icon">
        <Icon src={icon} size={28} />
      </span>
      <p className="empty-hint__title">{title}</p>
      {description && <p className="empty-hint__desc">{description}</p>}
      {children}
    </div>
  );
}
