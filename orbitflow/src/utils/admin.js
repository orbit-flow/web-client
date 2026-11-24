import { toLocalDateTime } from './date';

export const REPORT_STATUS = {
  RECEIVED: { label: '접수', tone: 'neutral' },
  CONFIRMED: { label: '확인됨', tone: 'accent' },
  SANCTIONED: { label: '제재', tone: 'danger' },
  REJECTED: { label: '기각', tone: 'neutral' },
};

export const REPORT_TYPES = {
  USER: '사용자',
  POST: '게시글',
  COMMENT: '댓글',
  DM: '채팅 메시지',
};

export const SUSPENSION_STATUS = {
  ACTIVE: { label: '정지 중', tone: 'danger' },
  RELEASED: { label: '해제됨', tone: 'neutral' },
  EXPIRED: { label: '만료', tone: 'neutral' },
};

// 정지 기간 고르기. days가 없으면 영구
export const SUSPENSION_PERIODS = [
  { value: '1', label: '1일' },
  { value: '3', label: '3일' },
  { value: '7', label: '7일' },
  { value: '30', label: '30일' },
  { value: 'permanent', label: '영구' },
];

// 고른 기간 → API 본문의 permanent·expiresAt
export function periodBody(period) {
  if (period === 'permanent') return { permanent: true };
  const expires = new Date(Date.now() + Number(period) * 24 * 60 * 60 * 1000);
  return { permanent: false, expiresAt: toLocalDateTime(expires) };
}

// "3b2f6c1e…9a1c"처럼 가운데를 줄인 uuid
export const shortUuid = (uuid) => (uuid && uuid.length > 12 ? `${uuid.slice(0, 4)}…${uuid.slice(-4)}` : uuid);
