import classNames from 'classnames';
import { Icon } from './Icon';
import userIcon from '../../assets/icons/user.svg';

const SIZES = { xs: 24, sm: 32, md: 44, lg: 64, xl: 112, xxl: 200 };

// size: xs24 · sm32 · md44 · lg64 · xl112 · xxl200 (64 이상은 큰 반경). 사진이 없으면 점선 테두리 자리표시
// ring: 레벨 색 테두리, level: 오른쪽 아래 레벨 배지
export function AvatarSlot({ src, alt = '', size = 'lg', ring = false, level }) {
  const px = SIZES[size];
  return (
    <div className={classNames('avatar-slot', `avatar-slot--${size}`, { 'avatar-slot--ring': ring })}>
      {src ? (
        <img className="avatar-slot__image" src={src} alt={alt} />
      ) : (
        <div className="avatar-slot__empty">
          <Icon src={userIcon} size={Math.round(px * 0.46)} />
        </div>
      )}
      {level != null && <span className="avatar-slot__level num">{level}</span>}
    </div>
  );
}
