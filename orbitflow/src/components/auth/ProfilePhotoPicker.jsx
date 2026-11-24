import { useRef, useState } from 'react';
import classNames from 'classnames';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import imageIcon from '../../assets/icons/image.svg';
import deletePhotoIcon from '../../assets/icons/delete-photo.svg';

// 서버 업로드 제한과 같다(PATCH /api/users/me/profile-image)
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PHOTO_NOTE = 'JPG · PNG · WEBP · GIF, 10MB 이하';

// 프로필 사진 고르기·지우기. 형식·크기를 검사한 파일만 onSelect로 넘긴다(업로드는 부모가)
export function ProfilePhotoPicker({ src, error, disabled = false, onSelect, onDelete }) {
  const inputRef = useRef(null);
  const [fileError, setFileError] = useState(null);
  const message = fileError ?? error;

  const handleChange = (event) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 골라도 change가 일어나도록 비운다
    event.target.value = '';
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      setFileError('JPG · PNG · WEBP · GIF 파일만 올릴 수 있어요');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError('10MB 이하 사진만 올릴 수 있어요');
      return;
    }
    setFileError(null);
    onSelect(file);
  };

  const handleDelete = () => {
    setFileError(null);
    onDelete();
  };

  return (
    <div className="photo-picker">
      <AvatarSlot src={src} alt="프로필 사진" />
      <div className="photo-picker__actions">
        <div className="photo-picker__buttons">
          <Button size="lg"
            variant="secondary"
            dense
            iconLeft={imageIcon}
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            사진 올리기
          </Button>
          <IconButton icon={deletePhotoIcon} label="사진 삭제" onClick={handleDelete} disabled={disabled || !src} />
        </div>
        <p
          className={classNames('photo-picker__note', { 'photo-picker__note--error': message })}
          role={message ? 'alert' : undefined}
        >
          {message ?? PHOTO_NOTE}
        </p>
        <input ref={inputRef} type="file" accept={IMAGE_TYPES.join(',')} hidden onChange={handleChange} />
      </div>
    </div>
  );
}
