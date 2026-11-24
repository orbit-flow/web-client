import classNames from 'classnames';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Menu } from '../ui/Menu';
import { parseLocal, timeAgo } from '../../utils/date';
import { notificationIconKind, notificationLabel } from '../../utils/notification';
import clockIcon from '../../assets/icons/clock.svg';
import coinsIcon from '../../assets/icons/coins.svg';
import storeIcon from '../../assets/icons/store.svg';
import teamIcon from '../../assets/icons/team.svg';

const ICONS = { clock: clockIcon, coins: coinsIcon, store: storeIcon, team: teamIcon };

// 알림 한 줄: 행위자 사진(없으면 종류 아이콘) + 문장 + "종류 · 시간" + (팔로우 요청이면 수락·거절) + 안 읽음 점 + 더보기
// compact: 사이드바 팝오버용(작은 아이콘, 버튼은 문장 아래, 더보기 없음)
export function NotificationItem({ notification, pendingFollow, compact = false, onOpen, onAccept, onReject, menuItems }) {
  const iconKind = notificationIconKind(notification);
  const unread = !notification.isRead;
  const actions = pendingFollow && (
    <div className="notification-item__actions" onClick={(event) => event.stopPropagation()}>
      <Button size="sm" onClick={onAccept}>
        수락
      </Button>
      <Button variant="neutral" size="sm" onClick={onReject}>
        거절
      </Button>
    </div>
  );

  return (
    <div className={classNames('notification-item', { 'notification-item--unread': unread, 'notification-item--compact': compact })}>
      <button type="button" className="notification-item__main" onClick={onOpen}>
        {iconKind ? (
          <span className="notification-item__icon" aria-hidden="true">
            <Icon src={ICONS[iconKind]} size={compact ? 16 : 24} />
          </span>
        ) : (
          <AvatarSlot src={notification.actor.profileImage} size={compact ? 'xs' : 'md'} />
        )}
        <span className="notification-item__text">
          <span className="notification-item__content">{notification.content}</span>
          <span className="notification-item__meta">
            {notificationLabel(notification, pendingFollow)} · {timeAgo(parseLocal(notification.createdAt))}
          </span>
        </span>
      </button>
      {compact ? actions && <div className="notification-item__below">{actions}</div> : actions}
      {!compact && unread && <span className="notification-item__dot" aria-label="안 읽음" />}
      {!compact && menuItems && <Menu label="알림 메뉴" items={menuItems} />}
    </div>
  );
}
