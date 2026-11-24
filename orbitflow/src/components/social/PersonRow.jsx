import { Link } from 'react-router-dom';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Menu } from '../ui/Menu';

// 사람 한 줄: 사진 + 이름(프로필 링크) + 보조 문구 + 오른쪽 버튼(children) + 더보기 메뉴
// linkProfile=false: 팀 안처럼 개인 프로필로 보내지 않는 곳(이름만)
export function PersonRow({ uuid, nickname, profileImage, subtitle, avatarSize = 'md', linkProfile = true, menuItems, children }) {
  return (
    <div className="person-row">
      <AvatarSlot src={profileImage} size={avatarSize} />
      <div className="person-row__text">
        {linkProfile ? (
          <Link to={`/users/${uuid}`} className="person-row__name">
            {nickname}
          </Link>
        ) : (
          <span className="person-row__name">{nickname}</span>
        )}
        {subtitle && <span className="person-row__subtitle">{subtitle}</span>}
      </div>
      {children}
      {menuItems && <Menu label={`${nickname} 메뉴`} items={menuItems} />}
    </div>
  );
}
