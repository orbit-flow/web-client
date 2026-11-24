// 알림 종류별 보조 문구("리마인드 · 10분 전"의 앞부분)와 누르면 갈 곳

const LABELS = {
  REMINDER: '리마인드',
  SOCIAL: '팔로우',
  TODO_COMPLETED: '할 일 완료',
  TODO_UNCOMPLETED: '할 일',
  TODO_ASSIGNED: '팀',
  ROUTINE_ASSIGNED: '팀',
  NEWPOST: '게시글',
  NEWCOMMENT: '댓글',
  LIKE: '좋아요',
  TEAM_JOINED: '팀',
  TEAM_JOIN_REQUESTED: '팀',
  TEAM_JOIN_REJECTED: '팀',
  TEAM_LEFT: '팀',
  TEAM_ROLE_CHANGED: '팀',
  CATEGORY_VISIBILITY_CHANGED: '팀',
  POINT_EARNED: '포인트',
  POINT_REVOKED: '포인트',
  ITEM_PURCHASED: '상점',
};

export const notificationLabel = (notification, pendingFollow) =>
  pendingFollow ? '팔로우 요청' : LABELS[notification.type] ?? '알림';

// 행위자가 없는 알림의 아이콘 종류: clock · team · coins · store
export function notificationIconKind({ type, actor, targetUuid }) {
  if (actor) return null;
  if (type === 'REMINDER') return 'clock';
  if (type.startsWith('POINT_')) return 'coins';
  if (type === 'ITEM_PURCHASED') return 'store';
  if (targetUuid || type.startsWith('TEAM_') || type === 'TODO_ASSIGNED') return 'team';
  return 'clock';
}

const POST_TYPES = new Set(['NEWPOST', 'NEWCOMMENT', 'LIKE']);
export const isPostNotification = (notification) => POST_TYPES.has(notification.type) && notification.targetId != null;

// 할 일 하나를 가리키는 알림(리마인드·배정·완료 취소) → 대시보드에서 그 할 일 창을 연다(/home?todo=id)
const TODO_TYPES = new Set(['REMINDER', 'TODO_ASSIGNED', 'TODO_UNCOMPLETED']);

// 게시글 알림은 화면 안에서 상세 모달로 열고(호출하는 쪽이 처리), 나머지는 이 경로로 보낸다
export function notificationPath({ type, actor, targetId, targetUuid }) {
  if (type === 'SOCIAL') return actor ? `/users/${actor.uuid}` : '/friends';
  if (TODO_TYPES.has(type) && targetId != null) return `/home?todo=${targetId}`;
  if (type === 'TODO_COMPLETED' && actor) return `/users/${actor.uuid}`;
  if (type === 'TEAM_JOIN_REQUESTED' && targetUuid) return `/teams/${targetUuid}/settings?section=invites`;
  if (type === 'TEAM_LEFT' && !actor) return '/teams';
  if (targetUuid) return `/teams/${targetUuid}`;
  if (type.startsWith('POINT_')) return '/points';
  if (type === 'ITEM_PURCHASED') return '/shop';
  return '/home';
}
