import classNames from 'classnames';

// 고를 수 있는 작은 칩. color가 있으면 왼쪽에 색 점(카테고리 색 등 임의 색)
// size: md 28 · lg 48(터치용). onClick이 없으면 누를 수 없는 표시용(span)
export function Tag({ color, selected = false, size = 'md', onClick, className, children }) {
  const content = (
    <>
      {color && <span className="tag__color" style={{ backgroundColor: color }} aria-hidden="true" />}
      {children}
    </>
  );
  const classes = classNames('tag', `tag--${size}`, { 'tag--selected': selected }, className);

  if (!onClick) return <span className={classes}>{content}</span>;
  return (
    <button type="button" className={classes} aria-pressed={selected} onClick={onClick}>
      {content}
    </button>
  );
}
