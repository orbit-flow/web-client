import { NavLink, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { useRealtime } from '../../hooks/useRealtime';
import { Icon } from '../ui/Icon';
import houseIcon from '../../assets/icons/house.svg';
import usersIcon from '../../assets/icons/users.svg';
import teamIcon from '../../assets/icons/team.svg';
import messageIcon from '../../assets/icons/message.svg';
import userIcon from '../../assets/icons/user.svg';

// 할 일·아바타·상점·포인트·설정은 "나" 안에서 들어간다
const TABS = [
  { to: '/home', label: '홈', icon: houseIcon },
  { to: '/timeline', label: '친구', icon: usersIcon, alsoActive: ['/friends', '/users/'] },
  { to: '/teams', label: '팀', icon: teamIcon },
  { to: '/chats', label: '채팅', icon: messageIcon, badge: 'chat' },
  { to: '/me', label: '나', icon: userIcon, alsoActive: ['/todos', '/avatar', '/shop', '/points', '/settings'] },
];

// 모바일(767px 이하) 하단 탭. 채팅은 안 읽은 대화가 있으면 점
export function MobileTabBar() {
  const { pathname } = useLocation();
  const { chatUnread } = useRealtime();

  return (
    <nav className="mobile-tab-bar" aria-label="주 메뉴">
      {TABS.map((tab) => {
        const dot = tab.badge === 'chat' && chatUnread > 0;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              classNames('mobile-tab-bar__item', {
                'mobile-tab-bar__item--active': isActive || tab.alsoActive?.some((path) => pathname.startsWith(path)),
              })
            }
            aria-label={dot ? `${tab.label} 안 읽은 대화 ${chatUnread}` : undefined}
          >
            <Icon src={tab.icon} />
            <span>{tab.label}</span>
            {dot && <span className="mobile-tab-bar__dot" aria-hidden="true" />}
          </NavLink>
        );
      })}
    </nav>
  );
}
