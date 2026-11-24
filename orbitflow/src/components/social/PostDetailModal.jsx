import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../api/axios';
import { getCategory } from '../../api/category';
import { createComment, deleteComment, getComments, getReplies, updateComment } from '../../api/comment';
import { toggleBlock } from '../../api/follow';
import { deletePost, getPost, getPostLikers, togglePostLike } from '../../api/post';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { GlyphButton } from '../ui/GlyphButton';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { Menu } from '../ui/Menu';
import { Modal } from '../ui/Modal';
import { ComposePostModal, LinkedTodo } from './ComposePostModal';
import { LikeButton } from './LikeButton';
import { ReportModal } from './ReportModal';
import { fromPost } from '../../utils/post';
import { parseLocal, timeAgo } from '../../utils/date';
import { categoryColor } from '../../utils/todo';
import { showErrorToast } from '../../utils/errorToast';
import closeIcon from '../../assets/icons/close.svg';
import xIcon from '../../assets/icons/x.svg';
import replyIcon from '../../assets/icons/reply.svg';
import chevronIcon from '../../assets/icons/chevron-right.svg';
import arrowIcon from '../../assets/icons/back.svg';
import { useToast } from '../../hooks/useRealtime';

const fetchPostDetail = (postId) => Promise.all([getPost(postId), getPostLikers(postId), getComments(postId)]);

// 모바일(social.css 767px 이하)에서는 댓글을 누르면 바로 답글을 단다
const isNarrow = () => window.matchMedia('(max-width: 767px)').matches;

// 손가락으로 이만큼(px) 넘게 밀면 다음·이전 사진
const SWIPE_DISTANCE = 40;

// 사진 칸 비율(가로/세로)의 범위: 세로 9:16(휴대폰 화면 캡처) ~ 가로 1.91:1. 이보다 길쭉하거나 납작한 사진은 이 범위 칸에 맞춰 넣는다
const MIN_RATIO = 9 / 16;
const MAX_RATIO = 1.91;

// 사진 넘김: 사진을 가로로 이어 붙이고 옆으로 밀어 보여 준다. 양옆 반투명 버튼(처음·끝에서는 흐려지며 숨음) + 아래 점(지금 사진은 크게)
// 칸과 비율이 다른 사진(2번째 이후 · 범위 밖)의 남는 자리는 뒤 화면이 흐리게 비치는 유리(social.css)
// onRatio: 첫 사진을 받으면 그 비율(범위 안으로 맞춘 값)을 알린다 — 모바일 사진 칸 높이를 사진에 맞춘다(social.css --photo-ratio, PC는 정사각형 고정)
// variant 'card': 모바일 게시글 목록의 대표 사진 칸(정사각형, 사진은 칸을 채워 자름). 버튼을 눌러도 카드(상세 열기)는 눌리지 않는다
// onImageClick(index): 사진을 누르면(상세에서 크게 보기)
export function PhotoCarousel({ images, onRatio, onImageClick, variant = 'modal' }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef(null);
  const last = images.length - 1;
  const go = (next) => setIndex(Math.min(Math.max(next, 0), last));
  const card = variant === 'card';
  const step = (event, next) => {
    event.stopPropagation();
    go(next);
  };

  return (
    <div
      className={card ? 'post-card__carousel' : 'post-modal__gallery'}
      onTouchStart={(event) => {
        touchX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchX.current === null) return;
        const moved = event.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(moved) > SWIPE_DISTANCE) go(index + (moved < 0 ? 1 : -1));
      }}
    >
      <div className="carousel__track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {images.map((url, i) => (
          <div key={`${i}-${url}`} className="carousel__slide" aria-hidden={i !== index}>
            <img
              className={card ? 'post-card__carousel-image' : classNames('post-modal__image', { 'post-modal__image--zoomable': onImageClick })}
              src={url}
              alt={`사진 ${i + 1}`}
              draggable={false}
              loading={card && i > 0 ? 'lazy' : undefined}
              onClick={onImageClick ? () => onImageClick(i) : undefined}
              onLoad={
                i === 0 && onRatio
                  ? (event) => {
                      const { naturalWidth, naturalHeight } = event.currentTarget;
                      if (naturalWidth && naturalHeight) onRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, naturalWidth / naturalHeight)));
                    }
                  : undefined
              }
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--prev"
            aria-label="이전 사진"
            disabled={index === 0}
            onClick={(event) => step(event, index - 1)}
          >
            <Icon src={chevronIcon} size={20} />
          </button>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--next"
            aria-label="다음 사진"
            disabled={index === last}
            onClick={(event) => step(event, index + 1)}
          >
            <Icon src={chevronIcon} size={20} />
          </button>
          <div className="carousel__dots" role="status" aria-label={`사진 ${images.length}장 중 ${index + 1}번째`}>
            {images.map((url, i) => (
              <span key={`${i}-${url}`} className={i === index ? 'carousel__dot carousel__dot--active' : 'carousel__dot'} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 사진 크게 보기(전체 화면, 검은 바탕): 사진은 화면에 맞춰 통째로, 양옆 이전·다음 · 위 몇 번째 · 닫기
// 키보드 ← → 로 넘기고 Esc로 닫는다(Esc는 이 화면만 닫고 뒤 게시글 창은 그대로). 휴대폰은 밀어서 넘긴다
function PhotoViewer({ images, start, onClose }) {
  const [index, setIndex] = useState(start);
  const touchX = useRef(null);
  const last = images.length - 1;
  const go = (next) => setIndex(Math.min(Math.max(next, 0), last));

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      } else if (event.key === 'ArrowLeft') setIndex((prev) => Math.max(prev - 1, 0));
      else if (event.key === 'ArrowRight') setIndex((prev) => Math.min(prev + 1, last));
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [last, onClose]);

  return createPortal(
    <div
      className="photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="사진 크게 보기"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      onTouchStart={(event) => {
        touchX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchX.current === null) return;
        const moved = event.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(moved) > SWIPE_DISTANCE) go(index + (moved < 0 ? 1 : -1));
      }}
    >
      <img className="photo-viewer__image" src={images[index]} alt={`사진 ${index + 1}`} draggable={false} />
      {images.length > 1 && (
        <>
          <span className="photo-viewer__count num" role="status">
            {index + 1} / {images.length}
          </span>
          <button type="button" className="carousel__arrow carousel__arrow--prev photo-viewer__arrow" aria-label="이전 사진" disabled={index === 0} onClick={() => go(index - 1)}>
            <Icon src={chevronIcon} size={24} />
          </button>
          <button type="button" className="carousel__arrow carousel__arrow--next photo-viewer__arrow" aria-label="다음 사진" disabled={index === last} onClick={() => go(index + 1)}>
            <Icon src={chevronIcon} size={24} />
          </button>
        </>
      )}
      <button type="button" className="photo-viewer__close" aria-label="닫기" onClick={onClose}>
        <Icon src={xIcon} size={24} />
      </button>
    </div>,
    document.body,
  );
}

// 게시글 상세: 왼쪽 사진(한 장씩 넘김) + 오른쪽 작성자 줄(위 고정) · 연결된 할 일·본문·좋아요·댓글(스크롤) · 댓글 입력(아래 고정)
// 모바일은 전체 화면: 작성자 줄이 맨 위, 그 아래 사진·본문, 댓글 입력은 화면 아래에 붙는다(social.css)
// onChanged: 좋아요·댓글·수정·삭제 뒤 목록을 새로 고치게 알린다(삭제면 deleted=true)
// fallbackCategory: { categoryName, color } — categoriesById로 못 찾을 때(남의 글) 보여 줄 카테고리
export function PostDetailModal({ postId, myUuid, categoriesById, fallbackCategory, onClose, onChanged }) {
  const toast = useToast();
  const [post, setPost] = useState(null);
  const [likers, setLikers] = useState([]);
  const [comments, setComments] = useState([]);
  const [replies, setReplies] = useState({});
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null); // 수정 중인 댓글 — 아래 입력 칸에 내용을 채워 고친다
  const [photoRatio, setPhotoRatio] = useState(1); // 첫 사진을 받기 전에는 정사각형 칸
  const [viewer, setViewer] = useState(null); // 크게 보는 사진 번호
  const inputRef = useRef(null);
  const [panel, setPanel] = useState(null); // { type: 'report', target } | { type: 'edit' } | { type: 'delete' }
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = ([loadedPost, likerPage, commentPage]) => {
    setPost(loadedPost);
    setLikers(likerPage.content);
    setComments(commentPage.content);
  };

  // 좋아요·댓글·수정 뒤 다시 받기
  const load = async () => apply(await fetchPostDetail(postId));

  useEffect(() => {
    let ignore = false;
    fetchPostDetail(postId)
      .then((data) => !ignore && apply(data))
      .catch((err) => {
        if (ignore) return;
        setFailed(true);
        showErrorToast(getErrorMessage(err, '게시글을 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [postId]);

  // 게시글 응답에는 카테고리 id만 있다. 넘겨받은 목록·카드에 없으면(알림에서 열기, 새로고침 직후 등) 하나만 따로 받는다
  const categoryId = post?.todo.categoryId;
  const knownCategory = categoriesById?.has(categoryId) || Boolean(fallbackCategory?.categoryName);
  const [fetchedCategory, setFetchedCategory] = useState(null);
  useEffect(() => {
    if (categoryId == null || knownCategory) return undefined;
    let ignore = false;
    getCategory(categoryId)
      .then((found) => !ignore && setFetchedCategory({ categoryName: found.name, color: categoryColor(found.color) }))
      .catch(() => {}); // 볼 수 없는 카테고리면 이름 없이 둔다
    return () => {
      ignore = true;
    };
  }, [categoryId, knownCategory]);

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  // 답글 달기·수정을 고르면 바로 입력 칸으로(입력 칸은 늘 있어 바로 옮길 수 있다)
  const startReply = (comment) => {
    if (editing) setText('');
    setEditing(null);
    setReplyTo(comment);
    inputRef.current?.focus();
  };

  const startEdit = (comment) => {
    setReplyTo(null);
    setText(comment.content);
    setEditing(comment);
    inputRef.current?.focus();
  };

  const cancelCompose = () => {
    if (editing) setText('');
    setReplyTo(null);
    setEditing(null);
  };

  const loadReplies = (commentId) =>
    run(async () => {
      const page = await getReplies(commentId);
      setReplies((prev) => ({ ...prev, [commentId]: page.content }));
    }, '답글을 불러오지 못했어요.');

  const handleLike = () =>
    run(async () => {
      const result = await togglePostLike(postId);
      setPost((prev) => ({ ...prev, liked: result.liked, likeCount: result.likeCount }));
      setLikers((await getPostLikers(postId)).content);
      onChanged?.();
    }, '좋아요를 바꾸지 못했어요.');

  const handleComment = (event) => {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    if (editing) {
      run(async () => {
        await updateComment(editing.id, { content });
        setText('');
        setEditing(null);
        // 수정 응답의 replyCount는 늘 0이라 목록을 다시 받는다
        if (editing.parentCommentId) await loadRepliesSilently(editing.parentCommentId);
        else await load();
      }, '댓글을 고치지 못했어요.');
      return;
    }
    run(async () => {
      await createComment(postId, { content, parentCommentId: replyTo?.id });
      setText('');
      if (replyTo) {
        setReplies((prev) => ({ ...prev, [replyTo.id]: undefined }));
        await loadRepliesSilently(replyTo.id);
      }
      setReplyTo(null);
      await load();
      onChanged?.();
    }, '댓글을 달지 못했어요.');
  };

  const loadRepliesSilently = async (commentId) => {
    const page = await getReplies(commentId);
    setReplies((prev) => ({ ...prev, [commentId]: page.content }));
  };

  const removeComment = (comment) =>
    run(async () => {
      await deleteComment(comment.id);
      if (comment.parentCommentId) await loadRepliesSilently(comment.parentCommentId);
      await load();
      onChanged?.();
    }, '댓글을 지우지 못했어요.');

  if (!post) {
    return (
      <Modal label="게시글" className="post-modal post-modal--loading" onClose={onClose}>
        <div className="post-modal__panel">
          <div className="post-modal__author">
            <span className="post-modal__spacer" />
            <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
          </div>
          <div className="post-modal__scroll">
            <p className="page__empty">{failed ? '게시글을 보여 줄 수 없어요' : '불러오는 중이에요'}</p>
          </div>
        </div>
      </Modal>
    );
  }

  const mine = post.author.uuid === myUuid;
  const normalized = fromPost(post, categoriesById);
  // 카테고리 목록에 없는 남의 카테고리는 목록 카드에서 받은 이름 · 색(타임라인), 그것도 없으면 따로 받은 것
  const category = fallbackCategory?.categoryName
    ? { categoryName: fallbackCategory.categoryName, color: fallbackCategory.color }
    : fetchedCategory;
  const images = post.imageUrls;
  const rest = post.likeCount - likers.length;

  const commentMenu = (comment) => [
    comment.author.uuid === myUuid && { label: '수정', onClick: () => startEdit(comment) },
    (comment.author.uuid === myUuid || mine) && { label: '삭제', danger: true, onClick: () => removeComment(comment) },
    comment.author.uuid !== myUuid && {
      label: '신고',
      onClick: () =>
        setPanel({
          type: 'report',
          target: {
            contentType: 'COMMENT',
            targetId: comment.id,
            description: `${comment.author.nickname}님의 댓글을 신고해요`,
            blockUuid: comment.author.uuid,
          },
        }),
    },
  ];

  const renderComment = (comment) => {
    const topLevel = !comment.parentCommentId;
    const opened = Boolean(replies[comment.id]);
    // 수정됨: 고친 시각이 쓴 시각보다 늦을 때(둘 다 초 단위)
    const edited = comment.updatedAt && comment.updatedAt !== comment.createdAt;
    return (
      <div key={comment.id} className="comment">
        <AvatarSlot src={comment.author.profileImage} size="sm" />
        <div
          className={topLevel ? 'comment__body comment__body--replyable' : 'comment__body'}
          onClick={(event) => {
            // 모바일: 이름·버튼이 아닌 곳을 누르면 이 댓글에 답글
            if (topLevel && isNarrow() && !event.target.closest('a, button')) startReply(comment);
          }}
        >
          <div className="comment__meta">
            <Link to={`/users/${comment.author.uuid}`} className="comment__name">
              {comment.author.nickname}
            </Link>
            <span className="comment__time">
              {timeAgo(parseLocal(comment.createdAt))}
              {edited && ' (수정됨)'}
            </span>
          </div>
          <p className="comment__content">{comment.author.blockedByMe ? '차단한 사용자의 댓글이에요' : comment.content}</p>
          {topLevel && (
            <div className="comment__footer">
              {comment.replyCount > 0 && (
                <button
                  type="button"
                  className="comment__action"
                  aria-expanded={opened}
                  onClick={() =>
                    opened ? setReplies((prev) => ({ ...prev, [comment.id]: undefined })) : loadReplies(comment.id)
                  }
                >
                  <Icon src={chevronIcon} size={14} className={opened ? 'comment__chevron comment__chevron--open' : 'comment__chevron'} />
                  {opened ? '답글 숨기기' : `답글 ${comment.replyCount}개 보기`}
                </button>
              )}
              <button type="button" className="comment__action comment__action--reply" onClick={() => startReply(comment)}>
                답글
              </button>
            </div>
          )}
        </div>
        <Menu label="댓글 메뉴" items={commentMenu(comment)} />
      </div>
    );
  };

  return (
    <>
      <Modal
        busy={busy}
        label="게시글 상세"
        className={images.length ? 'post-modal' : 'post-modal post-modal--text'}
        style={{ '--photo-ratio': photoRatio }}
        onClose={onClose}
      >
        {images.length > 0 && <PhotoCarousel images={images} onRatio={setPhotoRatio} onImageClick={setViewer} />}

        <div className="post-modal__panel">
          <div className="post-modal__author">
            <AvatarSlot src={post.author.profileImage} size="md" />
            <div className="post-modal__author-text">
              <Link to={`/users/${post.author.uuid}`} className="post-modal__author-name">
                {post.author.nickname}
              </Link>
              <span className="post-modal__time">{timeAgo(parseLocal(post.createdAt))}</span>
            </div>
            <Menu
              label="게시글 메뉴"
              items={[
                mine && { label: '수정', onClick: () => setPanel({ type: 'edit' }) },
                mine && { label: '삭제', danger: true, onClick: () => setPanel({ type: 'delete' }) },
                !mine && {
                  label: '신고',
                  onClick: () =>
                    setPanel({
                      type: 'report',
                      target: {
                        contentType: 'POST',
                        targetId: post.id,
                        description: `${post.author.nickname}님의 게시글 "${post.todo.name}"를 신고해요`,
                        blockUuid: post.author.uuid,
                      },
                    }),
                },
                !mine && {
                  label: post.author.blockedByMe ? '차단 해제' : '차단',
                  danger: !post.author.blockedByMe,
                  onClick: () => run(async () => {
                    await toggleBlock(post.author.uuid);
                    await load();
                  }, '차단을 바꾸지 못했어요.'),
                },
              ]}
            />
            <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
          </div>

          <div className="post-modal__scroll">
            {/* 연결된 할 일: 목록의 글 카드와 같은 모양(완료 표시 · 할 일 이름 · 카테고리 색 점 + 이름). 누를 수 있는 체크 상자처럼 보이지 않게 */}
            <LinkedTodo todo={normalized.todo.categoryName ? normalized.todo : { ...normalized.todo, ...category }} />

            <p className="post-modal__content">{post.author.blockedByMe ? '차단한 사용자의 글이에요' : post.content}</p>

            <div className="post-modal__reactions">
              <LikeButton liked={post.liked} count={post.likeCount} onClick={handleLike} disabled={busy} />
              {likers.length > 0 && (
                <span className="post-modal__likers">
                  {likers.map((liker) => liker.nickname).join(', ')}
                  {rest > 0 ? ` 외 ${rest}명이` : '님이'} 좋아해요
                </span>
              )}
            </div>

            <section className="post-modal__comments" aria-label="댓글">
              <div className="section-header">
                <h3 className="section-header__title">댓글</h3>
                <Badge>{post.commentCount}</Badge>
              </div>
              <div className="post-modal__comment-list">
                {comments.length === 0 && <p className="page__empty">첫 댓글을 남겨 보세요</p>}
                {comments.map((comment) => (
                  <div key={comment.id}>
                    {renderComment(comment)}
                    {replies[comment.id] && <div className="comment__replies">{replies[comment.id].map(renderComment)}</div>}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="post-modal__footer">
            {editing && (
              <div className="reply-target" role="status">
                <span className="reply-target__text">
                  <strong>댓글 수정</strong>
                  <span className="reply-target__preview">{editing.content}</span>
                </span>
                <button type="button" className="reply-target__cancel" aria-label="수정 취소" onClick={cancelCompose}>
                  <Icon src={xIcon} size={20} />
                </button>
              </div>
            )}
            {replyTo && (
              // 어느 댓글에 답하는지: 답글 아이콘 + 쓴 사람 + 댓글 앞부분(한 줄로 자름)
              <div className="reply-target" role="status">
                <Icon src={replyIcon} size={16} className="reply-target__icon" />
                <span className="reply-target__text">
                  <strong>{replyTo.author.nickname}</strong>
                  <span className="reply-target__preview">
                    {replyTo.author.blockedByMe ? '차단한 사용자의 댓글' : replyTo.content}
                  </span>
                </span>
                <button type="button" className="reply-target__cancel" aria-label="답글 취소" onClick={cancelCompose}>
                  <Icon src={xIcon} size={20} />
                </button>
              </div>
            )}
            <form className="post-modal__composer" onSubmit={handleComment}>
              {/* 한 줄 input이면 Chrome이 아이디 칸으로 보고 비밀번호 제안을 띄워서 textarea로 둔다.
                  PC: Enter는 보내기, Shift+Enter는 줄바꿈(한글 조합 중 Enter는 무시). 모바일: Enter는 줄바꿈, 보내기는 버튼 */}
              <div className="field post-modal__input">
                <textarea
                  ref={inputRef}
                  rows={1}
                  className="field__control post-modal__textarea"
                  aria-label="댓글"
                  placeholder={replyTo ? '답글 달기…' : '댓글 달기…'}
                  value={text}
                  maxLength={1000}
                  autoComplete="off"
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || isNarrow()) return;
                    event.preventDefault();
                    event.currentTarget.form.requestSubmit();
                  }}
                />
              </div>
              <GlyphButton type="submit" icon={arrowIcon} size={40} label={editing ? '저장' : '게시'} className="send-button" disabled={busy || !text.trim()} />
            </form>
          </div>
        </div>
      </Modal>

      {viewer !== null && <PhotoViewer images={images} start={viewer} onClose={() => setViewer(null)} />}
      {panel?.type === 'report' && <ReportModal target={panel.target} onClose={() => setPanel(null)} onBlocked={load} />}
      {panel?.type === 'edit' && (
        <ComposePostModal
          todo={normalized.todo}
          post={normalized}
          onClose={() => setPanel(null)}
          onSaved={async () => {
            setPanel(null);
            await load();
            onChanged?.();
          }}
        />
      )}
      {panel?.type === 'delete' && (
        <Dialog
          busy={busy}
          title="게시글 삭제"
          description="사진·댓글·좋아요도 함께 지워지고 되돌릴 수 없어요."
          onClose={() => setPanel(null)}
          actions={
            <>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await deletePost(post.id);
                    toast('게시글을 삭제했어요');
                    onChanged?.(true);
                    onClose();
                  }, '삭제하지 못했어요.')
                }
              >
                삭제
              </Button>
              <Button variant="neutral" onClick={() => setPanel(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
    </>
  );
}
