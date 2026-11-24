import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { logout } from '../../api/auth';
import { getMyAvatar } from '../../api/avatar';
import { getMe } from '../../api/user';
import { TABLET_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useRealtime } from '../../hooks/useRealtime';
import { NotificationPopover } from '../notification/NotificationPopover';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Badge } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { LevelBadge } from '../ui/LevelBadge';
import collapseIcon from '../../assets/icons/collapse-sidebar.svg';
import houseIcon from '../../assets/icons/house.svg';
import listTodoIcon from '../../assets/icons/list-todo.svg';
import teamIcon from '../../assets/icons/team.svg';
import usersIcon from '../../assets/icons/users.svg';
import messageIcon from '../../assets/icons/message.svg';
import bellIcon from '../../assets/icons/bell.svg';
import userIcon from '../../assets/icons/user.svg';
import storeIcon from '../../assets/icons/store.svg';
import coinsIcon from '../../assets/icons/coins.svg';
import settingsIcon from '../../assets/icons/settings.svg';

// 구역별 메뉴. 모바일 하단 탭(MobileTabBar)은 홈 · 친구 · 팀 · 채팅 · 나(나머지는 "나" 안으로)
const SECTIONS = [
  [
    { to: '/home', label: '홈', icon: houseIcon },
    { to: '/todos', label: '할 일', icon: listTodoIcon },
    { to: '/teams', label: '팀', icon: teamIcon },
    // 친구 = 타임라인이 먼저, 팔로워·팔로잉 목록(/friends)은 타임라인 안의 버튼으로
    { to: '/timeline', label: '친구', icon: usersIcon, alsoActive: ['/friends'] },
    { to: '/chats', label: '채팅', icon: messageIcon, badge: 'chat' },
    { to: '/notifications', label: '알림', icon: bellIcon, badge: 'notification', popover: true },
  ],
  [
    { to: '/avatar', label: '아바타', icon: userIcon },
    { to: '/shop', label: '상점', icon: storeIcon },
    { to: '/points', label: '포인트', icon: coinsIcon },
  ],
  [{ to: '/settings', label: '설정', icon: settingsIcon }],
];

const COLLAPSED_KEY = 'sidebarCollapsed';

// 접힘 여부는 이 브라우저에만 기억한다(저장소를 못 쓰면 펼친 채로)
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsed(value) {
  try {
    localStorage.setItem(COLLAPSED_KEY, String(value));
  } catch {
    // 저장 못 해도 이번 화면에서는 접힘이 유지된다
  }
}

const badgeText = (count) => (count > 99 ? '99+' : count);

// 데스크톱 왼쪽 메뉴. 펼침 264 / 접힘 88. 태블릿(768~1023)은 접힘(아이콘 레일)으로 고정하고 펼치기 버튼을 숨긴다
// 채팅·알림에는 안 읽은 수, "알림"은 누르면 옆에 최근 알림 팝오버
export function Sidebar() {
  const [storedCollapsed, setStoredCollapsed] = useState(readCollapsed);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const collapsed = isTablet || storedCollapsed;
  const [profile, setProfile] = useState(null);
  const [popover, setPopover] = useState(null); // { top, left }
  const { chatUnread, notificationUnread } = useRealtime();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const counts = { chat: chatUnread, notification: notificationUnread };
  const closePopover = useCallback(() => setPopover(null), []);
  const [profileMenu, setProfileMenu] = useState(null); // { bottom, left } — 내 프로필 카드 위에 띄우는 메뉴
  const profileRef = useRef(null);
  const profileMenuRef = useRef(null);

  // 프로필 메뉴는 바깥을 누르거나 Esc로 닫는다
  useEffect(() => {
    if (!profileMenu) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'mousedown' && (profileRef.current?.contains(event.target) || profileMenuRef.current?.contains(event.target))) return;
      setProfileMenu(null);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [profileMenu]);

  const toggleProfileMenu = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setProfileMenu((prev) => (prev ? null : { bottom: window.innerHeight - rect.top + 4, left: rect.left }));
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([getMe(), getMyAvatar()])
      .then(([me, avatar]) => {
        if (!ignore) {
          setProfile({ uuid: avatar.userUuid ?? me.uuid, nickname: me.nickname, profileImage: me.profileImage, level: avatar.level.level });
        }
      })
      .catch(() => {
        // 프로필을 못 불러와도 메뉴는 그대로 쓸 수 있다
      });
    return () => {
      ignore = true;
    };
  }, []);

  const toggle = () => {
    setStoredCollapsed((prev) => {
      writeCollapsed(!prev);
      return !prev;
    });
  };

  return (
    <aside className={classNames('sidebar', { 'sidebar--collapsed': collapsed })}>
      <div className="sidebar__top">
        <div className="sidebar__brand">
          {!collapsed && <span className="sidebar__logo">Orbitflow</span>}
          {!isTablet && (
            <IconButton
              icon={collapseIcon}
              label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
              className="sidebar__toggle"
              onClick={toggle}
              aria-expanded={!collapsed}
            />
          )}
        </div>

        <nav className="sidebar__nav" aria-label="주 메뉴">
          {SECTIONS.map((items, index) => (
            <Fragment key={items[0].to}>
              {index > 0 && <div className="sidebar__divider" role="separator" />}
              {items.map((item) => {
                const count = counts[item.badge] ?? 0;
                const content = (
                  <>
                    <Icon src={item.icon} />
                    {!collapsed && <span className="sidebar__label">{item.label}</span>}
                    {count > 0 && (
                      <Badge tone="danger" solid className="sidebar__badge">
                        {badgeText(count)}
                      </Badge>
                    )}
                  </>
                );
                const label = collapsed ? `${item.label}${count > 0 ? ` ${count}` : ''}` : undefined;
                if (item.popover) {
                  return (
                    <button
                      key={item.to}
                      type="button"
                      className={classNames('sidebar__item', {
                        'sidebar__item--active': popover != null || pathname.startsWith(item.to),
                      })}
                      aria-label={label}
                      title={collapsed ? item.label : undefined}
                      aria-haspopup="dialog"
                      aria-expanded={popover != null}
                      onMouseDown={(event) => popover != null && event.stopPropagation()}
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const sidebarRight = event.currentTarget.closest('.sidebar').getBoundingClientRect().right;
                        setPopover((prev) => (prev ? null : { top: Math.max(16, rect.top - 14), left: sidebarRight - 2 }));
                      }}
                    >
                      {content}
                    </button>
                  );
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      classNames('sidebar__item', {
                        'sidebar__item--active': isActive || item.alsoActive?.some((path) => pathname.startsWith(path)),
                      })
                    }
                    aria-label={label}
                    title={collapsed ? item.label : undefined}
                  >
                    {content}
                  </NavLink>
                );
              })}
            </Fragment>
          ))}
        </nav>
      </div>

      {/* 사이드바(sticky)는 자기만의 쌓임 맥락이라 그 안에 두면 본문의 위치 지정 요소(아바타 그림 등) 밑에 깔린다 → body로 */}
      {popover && createPortal(<NotificationPopover position={popover} onClose={closePopover} />, document.body)}

      {/* 누르면 위로 메뉴: 내 대시보드 보기(홈) · 로그아웃 */}
      <div className="sidebar__profile">
        {profile?.uuid ? (
          <button
            type="button"
            ref={profileRef}
            className={classNames('sidebar__profile-card', {
              'sidebar__profile-card--active': profileMenu != null,
            })}
            title={collapsed ? `${profile.nickname} · 내 프로필` : undefined}
            aria-label={collapsed ? `${profile.nickname} 메뉴` : undefined}
            aria-haspopup="menu"
            aria-expanded={profileMenu != null}
            onClick={toggleProfileMenu}
          >
            <AvatarSlot src={profile.profileImage} alt="" size="md" />
            {!collapsed && (
              <div className="sidebar__identity">
                <span className="sidebar__name">{profile.nickname}</span>
                <LevelBadge type="text" level={profile.level} />
              </div>
            )}
          </button>
        ) : (
          <div className="sidebar__profile-card">
            <AvatarSlot src={profile?.profileImage} alt="" size="md" />
          </div>
        )}
      </div>

      {profileMenu &&
        createPortal(
          <ul ref={profileMenuRef} className="menu__list" role="menu" style={profileMenu}>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="menu__item"
                onClick={() => {
                  setProfileMenu(null);
                  navigate('/home');
                }}
              >
                내 대시보드 보기
              </button>
            </li>
            <li role="none">
              <button type="button" role="menuitem" className="menu__item menu__item--danger" onClick={() => logout().then(() => window.location.assign('/login'))}>
                로그아웃
              </button>
            </li>
          </ul>,
          document.body,
        )}
    </aside>
  );
}
