import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { matchPath, NavLink, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { useGoBack } from '../../hooks/useGoBack';
import { useRealtime } from '../../hooks/useRealtime';
import { Badge } from '../ui/Badge';
import { GlyphButton } from '../ui/GlyphButton';
import { Icon } from '../ui/Icon';
import backIcon from '../../assets/icons/back.svg';
import bellIcon from '../../assets/icons/bell.svg';

// 하단 탭의 첫 화면: 큰 제목, 뒤로 없음
const ROOTS = [
  { path: '/home', title: '홈' },
  { path: '/timeline', title: '친구' },
  { path: '/teams', title: '팀' },
  { path: '/chats', title: '채팅' },
  { path: '/me', title: '나' },
];

// 그 밖의 화면: 작은 제목 + 뒤로. parent는 이 화면으로 바로 들어와 뒤로 갈 기록이 없을 때 갈 곳.
// title이 없으면 화면이 MobileTopBarTitle로 넣는다(사람·팀 이름 등)
const PAGES = [
  { path: '/avatar', title: '아바타', parent: '/me' },
  { path: '/shop', title: '상점', parent: '/me' },
  { path: '/points', title: '포인트', parent: '/me' },
  { path: '/settings', parent: '/me' },
  { path: '/todos', parent: '/me' },
  { path: '/notifications', title: '알림', parent: '/home' },
  { path: '/friends', parent: '/timeline' },
  { path: '/users/:uuid', parent: '/timeline' },
  { path: '/teams/:uuid/*', parent: '/teams' },
];

const badgeText = (count) => (count > 99 ? '99+' : count);

// 화면이 상단바에 제목·오른쪽 버튼을 꽂는 자리(포털 대상). AppLayout이 감싼다
const SlotsContext = createContext(null);

export function MobileTopBarProvider({ children }) {
  const [slots, setSlots] = useState({ title: null, actions: null });
  const registerTitle = useCallback((element) => setSlots((prev) => (prev.title === element ? prev : { ...prev, title: element })), []);
  const registerActions = useCallback((element) => setSlots((prev) => (prev.actions === element ? prev : { ...prev, actions: element })), []);
  const value = useMemo(() => ({ slots, registerTitle, registerActions }), [slots, registerTitle, registerActions]);
  return <SlotsContext.Provider value={value}>{children}</SlotsContext.Provider>;
}

// 정해 둔 제목이 없는 화면의 상단바 제목. 넣으면 화면 안의 큰 제목은 숨는다(layout.css)
export function MobileTopBarTitle({ children }) {
  const slot = useContext(SlotsContext)?.slots.title;
  return slot ? createPortal(children, slot) : null;
}

// 상단바 오른쪽, 알림 벨 앞에 놓을 버튼. 데스크톱에서는 상단바째 숨으므로 화면 안 버튼은 모바일에서만 숨긴다
export function MobileTopBarActions({ children }) {
  const slot = useContext(SlotsContext)?.slots.actions;
  return slot ? createPortal(children, slot) : null;
}

// 모바일(767px 이하) 상단바 52. 제목 · 뒤로 · 화면별 버튼 · 알림 벨(안 읽은 수)
// 제목이 있으면 화면 안의 큰 제목(.page__title)은 숨긴다(layout.css)
export function MobileTopBar() {
  const { pathname } = useLocation();
  const { notificationUnread } = useRealtime();
  const { registerTitle, registerActions } = useContext(SlotsContext);
  const root = ROOTS.find((item) => matchPath(item.path, pathname));
  const page = root ? null : PAGES.find((item) => matchPath(item.path, pathname));
  const title = root?.title ?? page?.title ?? '';

  // 앱 안에서 들어왔으면 직전 화면으로, 주소로 바로 열었으면 상위 화면으로
  const goBack = useGoBack(page?.parent ?? '/home');

  return (
    <header
      className={classNames('mobile-top-bar', {
        'mobile-top-bar--root': root,
        'mobile-top-bar--back': !root,
        'mobile-top-bar--titled': title,
      })}
    >
      {/* back.svg는 48 칸 안 화살표가 1/3이라 아이콘을 56으로 그려 화살표를 18 이상으로(누르는 칸은 48 그대로) */}
      {!root && <GlyphButton icon={backIcon} label="뒤로" size={56} onClick={goBack} />}
      <h1 className="mobile-top-bar__title">
        {title}
        <span ref={registerTitle} className="mobile-top-bar__title-slot" />
      </h1>
      <div ref={registerActions} className="mobile-top-bar__actions" />
      {pathname !== '/notifications' && (
        <NavLink to="/notifications" className="mobile-top-bar__action" aria-label={`알림${notificationUnread > 0 ? ` ${notificationUnread}` : ''}`}>
          <Icon src={bellIcon} />
          {notificationUnread > 0 && (
            <Badge tone="danger" solid className="mobile-top-bar__badge">
              {badgeText(notificationUnread)}
            </Badge>
          )}
        </NavLink>
      )}
    </header>
  );
}
