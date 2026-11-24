import { useNavigate, useSearchParams } from 'react-router-dom';
import { NotificationItem } from '../components/notification/NotificationItem';
import { PostDetailModal } from '../components/social/PostDetailModal';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { useNotificationList } from '../hooks/useNotificationList';
import { useRealtime } from '../hooks/useRealtime';
import checkIcon from '../assets/icons/check.svg';

// 알림: 전체·안 읽음 탭(?tab=unread), 게시글 알림은 상세 모달(?post=)로 연다
export function NotificationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'unread' ? 'unread' : 'all';
  const postId = searchParams.get('post');
  const { myUuid, notificationUnread } = useRealtime();
  const list = useNotificationList({
    unreadOnly: tab === 'unread',
    onOpenPost: (id) => setSearchParams({ ...(tab === 'unread' ? { tab } : {}), post: String(id) }),
  });

  const closePost = () => setSearchParams(tab === 'unread' ? { tab } : {});

  return (
    <div className="page notifications-page">
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">알림</h1>
          <p className="page__subtitle">최근 30일 알림이에요</p>
        </div>
        <div className="notifications-page__actions">
          <Button variant="ghost" iconLeft={checkIcon} disabled={notificationUnread === 0} onClick={list.readAll}>
            모두 읽음
          </Button>
          <Button variant="neutral" onClick={() => navigate('/settings?section=notifications')}>
            알림 설정
          </Button>
        </div>
      </header>

      <div className="notifications-page__body">
        <Tabs
          items={[
            { value: 'all', label: '전체' },
            { value: 'unread', label: '안 읽음', count: notificationUnread },
          ]}
          value={tab}
          onChange={(value) => setSearchParams(value === 'unread' ? { tab: value } : {})}
          label="알림 보기"
        />

        {list.loadFailed && !list.items && <p className="page__empty">알림을 불러오지 못했어요</p>}
        {list.items && list.items.length === 0 && (
          <div className="empty-state empty-state--card">
            <p className="empty-state__title">{tab === 'unread' ? '안 읽은 알림이 없어요' : '아직 알림이 없어요'}</p>
            <p className="empty-state__desc">팔로우·댓글·팀 소식이 생기면 여기에 모여요</p>
          </div>
        )}
        {list.items && list.items.length > 0 && (
          <div className="notification-list">
            {list.items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                pendingFollow={list.isPendingFollow(notification)}
                onOpen={() => list.open(notification)}
                onAccept={() => list.accept(notification)}
                onReject={() => list.reject(notification)}
                menuItems={[
                  !notification.isRead && { label: '읽음으로 표시', onClick: () => list.markRead(notification) },
                  { label: '삭제', danger: true, onClick: () => list.remove(notification) },
                ]}
              />
            ))}
          </div>
        )}
      </div>

      {postId && <PostDetailModal postId={Number(postId)} myUuid={myUuid} onClose={closePost} />}
    </div>
  );
}
