import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useNotificationList } from '../../hooks/useNotificationList';
import { useRealtime } from '../../hooks/useRealtime';
import { NotificationItem } from './NotificationItem';

const POPOVER_SIZE = 5;

// 사이드바 "알림"을 누르면 옆에 뜨는 최근 알림. position { top, left }는 누른 메뉴 옆
export function NotificationPopover({ position, onClose }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const { notificationUnread } = useRealtime();
  const go = (path) => {
    onClose();
    navigate(path);
  };
  const list = useNotificationList({ size: POPOVER_SIZE, onOpenPost: (id) => go(`/notifications?post=${id}`) });

  // 바깥을 누르거나 Esc면 닫는다
  useEffect(() => {
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) onClose();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [onClose]);

  return (
    <section ref={rootRef} className="notification-popover" style={position} role="dialog" aria-label="최근 알림">
      <header className="notification-popover__head">
        <h2 className="notification-popover__title">알림</h2>
        {notificationUnread > 0 && (
          <Badge tone="danger" solid>
            {notificationUnread}
          </Badge>
        )}
        <span className="board-column__spacer" />
        <Button variant="ghost" dense disabled={notificationUnread === 0} onClick={list.readAll}>
          모두 읽음
        </Button>
      </header>
      <div className="notification-popover__list">
        {list.loadFailed && !list.items && <p className="page__empty">알림을 불러오지 못했어요</p>}
        {list.items && list.items.length === 0 && <p className="page__empty">새 알림이 없어요</p>}
        {list.items?.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            pendingFollow={list.isPendingFollow(notification)}
            compact
            onOpen={() => {
              list.open(notification);
              onClose();
            }}
            onAccept={() => list.accept(notification)}
            onReject={() => list.reject(notification)}
          />
        ))}
      </div>
      <button type="button" className="notification-popover__all" onClick={() => go('/notifications')}>
        알림 전체 보기
      </button>
    </section>
  );
}
