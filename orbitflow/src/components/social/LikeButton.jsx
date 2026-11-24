import classNames from 'classnames';
import { Icon } from '../ui/Icon';
import heartIcon from '../../assets/icons/heart.svg';
import heartFillIcon from '../../assets/icons/heart-fill.svg';

// ♥ 좋아요 12 — 하트를 누르면 색이 들어온다(좋아요한 상태는 채운 빨간 하트)
// onClick이 없으면 누를 수 없는 표시용(게시글 카드의 개수)
export function LikeButton({ liked = false, count, onClick, disabled = false, size = 'md' }) {
  const content = (
    <>
      <Icon src={liked ? heartFillIcon : heartIcon} size={size === 'sm' ? 14 : 18} className="like-button__icon" />
      <span className="num">좋아요 {count}</span>
    </>
  );
  const className = classNames('like-button', `like-button--${size}`, { 'like-button--liked': liked });

  if (!onClick) return <span className={className}>{content}</span>;
  return (
    <button
      type="button"
      className={className}
      aria-pressed={liked}
      aria-label={liked ? `좋아요 취소 (${count})` : `좋아요 (${count})`}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
