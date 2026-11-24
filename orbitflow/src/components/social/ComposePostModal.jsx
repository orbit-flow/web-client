import { useEffect, useMemo, useRef, useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { createPost, updatePost } from '../../api/post';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LeaveConfirmDialog, UnsavedChangesGuard } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { showErrorToast } from '../../utils/errorToast';
import checkIcon from '../../assets/icons/check.svg';
import closeIcon from '../../assets/icons/close.svg';
import plusIcon from '../../assets/icons/plus.svg';
import { useToast } from '../../hooks/useRealtime';

const MAX_PHOTOS = 3;
const CONTENT_MAX = 1000;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const VISIBILITY_LABEL = { PUBLIC: '전체 공개', FOLLOWER: '팔로워 공개', PRIVATE: '나만 보기' };
// 팀 카테고리는 같은 값이라도 뜻이 달라 문구가 다르다(utils/team TEAM_VISIBILITY와 같음)
const TEAM_VISIBILITY_LABEL = { PUBLIC: '전체 공개', FOLLOWER: '팀 공개', PRIVATE: '역할 지정' };

// 글에 연결된 할 일(작성 · 상세 공통): 위 카테고리(색 점 · 이름) · 아래 체크 상자(끝냈으면 카테고리 색 ✓, 색을 모르면 초록) + 할 일 이름
// 체크 상자는 할 일 이름 줄 가운데에 맞추고(social.css 격자), 표시만 하고 누를 수는 없다. children은 오른쪽 끝(공개 범위 배지 등)
export function LinkedTodo({ todo, children }) {
  return (
    <div className="linked-todo" style={todo.color ? { '--checkbox-color': todo.color } : undefined}>
      <span
        className={todo.isCompleted ? 'linked-todo__check linked-todo__check--done' : 'linked-todo__check'}
        role="img"
        aria-label={todo.isCompleted ? '완료한 할 일' : '진행 중인 할 일'}
      >
        {todo.isCompleted && <Icon src={checkIcon} size={16} />}
      </span>
      <div className="linked-todo__text">
        {todo.categoryName && (
          <span className="linked-todo__meta">
            <span className="post-card__color" style={{ backgroundColor: todo.color }} aria-hidden="true" />
            {todo.categoryName}
          </span>
        )}
        <span className="linked-todo__name">{todo.name}</span>
      </div>
      {children && <span className="linked-todo__extra">{children}</span>}
    </div>
  );
}

// 할 일에 연결된 글 작성·수정. todo: { id, name, isCompleted, visibility?, teamCategory? }, post가 있으면 수정
// 사진은 최대 3장: 수정이면 남길 기존 사진 + 새로 고른 사진
export function ComposePostModal({ todo, post, onClose, onSaved }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [content, setContent] = useState(post?.content ?? '');
  const [keptUrls, setKeptUrls] = useState(post?.images ?? []);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const previews = useObjectUrls(files);
  const photoCount = keptUrls.length + files.length;
  // 쓰거나 바꾼 내용(글 · 사진)이 있으면 닫기 · 다른 화면 이동 전에 묻는다
  const dirty = !saving && (content !== (post?.content ?? '') || files.length > 0 || keptUrls.length !== (post?.images?.length ?? 0));
  const requestClose = () => (dirty ? setConfirmLeave(true) : onClose());

  const addFiles = (event) => {
    const picked = [...event.target.files];
    event.target.value = '';
    if (picked.some((file) => !IMAGE_TYPES.includes(file.type))) {
      showErrorToast('JPG · PNG · WEBP · GIF 사진만 올릴 수 있어요');
      return;
    }
    if (picked.some((file) => file.size > MAX_IMAGE_BYTES)) {
      showErrorToast('사진은 한 장에 10MB까지예요');
      return;
    }
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS - keptUrls.length));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!content.trim()) {
      showErrorToast('내용을 입력해 주세요');
      return;
    }
    setSaving(true);
    try {
      if (post) await updatePost(post.id, { content: content.trim(), keepImageUrls: keptUrls, images: files });
      else await createPost(todo.id, { content: content.trim(), images: files });
      toast(post ? '게시글을 수정했어요' : '게시글을 올렸어요');
      onSaved();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '올리지 못했어요. 잠시 후 다시 시도해 주세요.'));
      setSaving(false);
    }
  };

  return (
    <Modal busy={saving} label={post ? '게시글 수정' : '게시글 작성'} className="modal--form compose-modal" onClose={requestClose}>
      <UnsavedChangesGuard when={dirty} />
      {confirmLeave && <LeaveConfirmDialog onLeave={onClose} onStay={() => setConfirmLeave(false)} />}
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">{post ? '게시글 수정' : '게시글 작성'}</h2>
          <p className="modal__subtitle">할 일에 연결된 글이에요. 공개 범위는 카테고리 설정을 따라요</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={requestClose} />
      </div>

      <form className="modal__form" onSubmit={handleSubmit}>
        <LinkedTodo todo={todo}>
          {todo.visibility && <Badge>{(todo.teamCategory ? TEAM_VISIBILITY_LABEL : VISIBILITY_LABEL)[todo.visibility]}</Badge>}
        </LinkedTodo>
        {todo.teamCategory && todo.visibility === 'PUBLIC' && (
          <p className="modal__notice">이 글은 팀원이 아닌 사람도 볼 수 있어요</p>
        )}

        <Textarea
          label="내용"
          value={content}
          maxLength={CONTENT_MAX}
          placeholder="할 일을 하며 느낀 점을 남겨 보세요"
          onChange={(event) => setContent(event.target.value)}
          autoFocus
        />

        <div className="compose-modal__photos">
          <div className="compose-modal__photos-header">
            <span className="compose-modal__photos-title">사진</span>
            <span className="compose-modal__photos-hint">최대 3장</span>
          </div>
          <div className="compose-modal__photo-row">
            {keptUrls.map((url) => (
              <PhotoThumb key={url} src={url} onRemove={() => setKeptUrls((prev) => prev.filter((item) => item !== url))} />
            ))}
            {previews.map((url, index) => (
              <PhotoThumb key={url} src={url} onRemove={() => setFiles((prev) => prev.filter((_, i) => i !== index))} />
            ))}
            {photoCount < MAX_PHOTOS && (
              <button type="button" className="compose-modal__add-photo" onClick={() => inputRef.current?.click()}>
                <Icon src={plusIcon} size={24} />
                <span className="num">
                  {photoCount} / {MAX_PHOTOS}
                </span>
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept={IMAGE_TYPES.join(',')} multiple hidden onChange={addFiles} />
        </div>

        <div className="modal__actions">
          <Button variant="neutral" onClick={requestClose}>
            취소
          </Button>
          <Button type="submit" disabled={saving}>
            {post ? '저장' : '올리기'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PhotoThumb({ src, onRemove }) {
  return (
    <div className="compose-modal__photo">
      <img src={src} alt="" />
      <IconButton icon={closeIcon} label="사진 빼기" className="compose-modal__remove" onClick={onRemove} />
    </div>
  );
}

// 고른 파일의 미리보기 주소. 파일 목록이 바뀌거나 닫힐 때 주소를 해제한다
function useObjectUrls(files) {
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);
  return urls;
}
