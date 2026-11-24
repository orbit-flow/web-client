import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { getReports } from '../../api/admin';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import flagIcon from '../../assets/icons/flag.svg';
import houseIcon from '../../assets/icons/house.svg';
import listIcon from '../../assets/icons/list-todo.svg';
import lockIcon from '../../assets/icons/lock.svg';
import settingsIcon from '../../assets/icons/settings.svg';
import storeIcon from '../../assets/icons/store.svg';
import userIcon from '../../assets/icons/user.svg';

const ITEMS = [
  { to: '/admin/reports', label: '신고', icon: flagIcon, dot: true },
  { to: '/admin/suspensions', label: '정지', icon: lockIcon },
  { to: '/admin/items', label: '아이템', icon: storeIcon },
  { to: '/admin/users', label: '사용자', icon: userIcon },
  { to: '/admin/monitoring', label: '모니터링', icon: settingsIcon },
  { to: '/admin/logs', label: '로그', icon: listIcon },
];

// 관리자 화면 틀: 왼쪽 관리자 메뉴(접수된 신고가 있으면 빨간 점) + 본문
// 관리자 API가 403이면 권한 안내, 좁은 화면이면 데스크톱 안내를 보여 준다
export function AdminLayout() {
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading · ok · denied · error
  const [received, setReceived] = useState(0);

  const refreshReceived = useCallback(
    () =>
      getReports({ status: 'RECEIVED', size: 1 })
        .then((page) => {
          setReceived(page.totalElements);
          setState('ok');
        })
        .catch((err) => setState(err.response?.status === 403 ? 'denied' : 'error')),
    [],
  );

  useEffect(() => {
    refreshReceived();
  }, [refreshReceived]);

  const back = (
    <Button variant="ghost" iconLeft={houseIcon} className="admin-sidebar__back" onClick={() => navigate('/home')}>
      서비스로 돌아가기
    </Button>
  );

  return (
    <>
      <div className="admin-mobile">
        <span className="admin-mobile__icon" aria-hidden="true">
          <Icon src={settingsIcon} size={28} />
        </span>
        <p className="admin-mobile__title">관리자 화면은 데스크톱에서만 지원해요</p>
        <p className="admin-mobile__desc">PC에서 /admin 으로 접속해 주세요</p>
        <Button fullWidth onClick={() => navigate('/home')}>
          서비스로 돌아가기
        </Button>
      </div>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__brand">
            <span className="admin-sidebar__logo">Orbitflow</span>
            <Badge tone="danger" solid>
              ADMIN
            </Badge>
          </div>
          <nav className="admin-sidebar__nav" aria-label="관리자 메뉴">
            {ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => classNames('sidebar__item', { 'sidebar__item--active': isActive })}
              >
                <Icon src={item.icon} />
                <span className="sidebar__label">{item.label}</span>
                {item.dot && received > 0 && <span className="admin-sidebar__dot" aria-label={`접수된 신고 ${received}건`} />}
              </NavLink>
            ))}
          </nav>
          {back}
        </aside>
        <main className="admin-layout__main">
          {state === 'ok' && <Outlet context={{ refreshReceived }} />}
          {state === 'loading' && <p className="page__empty admin-layout__message">불러오는 중이에요</p>}
          {state === 'denied' && (
            <div className="empty-state admin-layout__message">
              <p className="empty-state__title">관리자만 볼 수 있어요</p>
              <p className="empty-state__desc">관리자 권한이 있는 계정으로 로그인해 주세요</p>
            </div>
          )}
          {state === 'error' && (
            <div className="empty-state admin-layout__message">
              <p className="empty-state__title">관리자 정보를 불러오지 못했어요</p>
              <Button variant="neutral" dense onClick={refreshReceived}>
                다시 시도
              </Button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
