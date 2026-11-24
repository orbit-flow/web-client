import { Link } from 'react-router-dom';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Icon } from '../ui/Icon';
import { Menu } from '../ui/Menu';
import { MOBILE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { formatMonthDay, parseLocal, timeAgo } from '../../utils/date';
import checkCircleIcon from '../../assets/icons/check-circle.svg';
import { LikeButton } from './LikeButton';
import { PhotoCarousel } from './PostDetailModal';

// 할 일에 붙은 글 카드(post는 utils/post의 모양). 누르면 onOpen(상세)
// showAuthor면 위에 작성자 줄(타임라인), menuItems는 작성자 줄의 더보기 메뉴
// 사진: PC는 나란히 모두, 모바일은 대표 사진 한 장 칸에서 옆으로 넘겨 본다(PhotoCarousel card)
export function PostCard({ post, onOpen, showAuthor = false, menuItems = [] }) {
  const created = parseLocal(post.createdAt);
  const isMobile = useMediaQuery(MOBILE_QUERY);

  return (
    <article
      className="post-card"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen();
      }}
      aria-label={`${post.todo.name} 게시글 열기`}
    >
      {showAuthor && (
        <div className="post-card__author">
          <AvatarSlot src={post.author.profileImage} size="md" />
          <div className="post-card__author-text">
            <Link to={`/users/${post.author.uuid}`} className="post-card__author-name" onClick={(event) => event.stopPropagation()}>
              {post.author.nickname}
            </Link>
            <span className="post-card__time">{timeAgo(created)}</span>
          </div>
          <Menu label="게시글 메뉴" items={menuItems} />
        </div>
      )}

      <div className="post-card__header" style={post.todo.color ? { '--checkbox-color': post.todo.color } : undefined}>
        <span className="post-card__todo-icon">
          <Icon src={checkCircleIcon} size={16} />
        </span>
        <span className="post-card__todo">{post.todo.name}</span>
        {post.todo.categoryName && (
          <span className="post-card__category">
            <span className="post-card__color" style={{ backgroundColor: post.todo.color }} aria-hidden="true" />
            {post.todo.categoryName}
          </span>
        )}
        <span className="post-card__date num">{formatMonthDay(created)}</span>
      </div>

      {post.author?.blockedByMe ? (
        <p className="post-card__content post-card__content--muted">차단한 사용자의 글이에요</p>
      ) : (
        <p className="post-card__content">{post.content}</p>
      )}

      {post.images.length > 0 && !post.author?.blockedByMe && isMobile && <PhotoCarousel images={post.images} variant="card" />}
      {post.images.length > 0 && !post.author?.blockedByMe && !isMobile && (
        <div className="post-card__gallery">
          {post.images.map((url, index) => (
            <img key={url} className="post-card__photo" src={url} alt={`사진 ${index + 1}`} loading="lazy" />
          ))}
        </div>
      )}

      <div className="post-card__footer num">
        <LikeButton liked={post.liked} count={post.likeCount} size="sm" />
        <span>댓글 {post.commentCount}</span>
      </div>
    </article>
  );
}
