// 서버 LocalDate·LocalDateTime은 시간대가 없는 서울 시각이다. 기기 시간대도 서울이라고 보고 로컬 Date로 다룬다

export const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n) => String(n).padStart(2, '0');
// Date → "2026-10-26"
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Date → "2026-10-26T13:00:00"
export function toLocalDateTime(date) {
  return `${toDateKey(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

// "2026-10-26" 또는 "2026-10-26T13:00:00(.123)" → 로컬 Date
export function parseLocal(value) {
  const [date, time = '00:00:00'] = value.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

// 월요일 시작 주
export function startOfWeek(date) {
  return addDays(startOfDay(date), -((date.getDay() + 6) % 7));
}

// 달력 칸: 그 달 1일이 든 주 월요일 ~ 말일이 든 주 일요일 (최대 42일)
export function monthGrid(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(last), 6);
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

// 오늘 기준 며칠 남았는지(날짜 단위). 지났으면 음수
export function daysFromToday(date) {
  return Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
}

export const formatTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
export const formatMonthDay = (date) => `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
export const formatShortDate = (date) => `${date.getMonth() + 1}.${date.getDate()}`;
export const formatDayTitle = (date) => `${date.getMonth() + 1}월 ${date.getDate()}일 (${DAY_NAMES[date.getDay()]})`;
export const formatYearMonth = (date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
export const weekdayName = (date) => DAY_NAMES[date.getDay()];

// "방금 전", "5분 전", "3시간 전", "2일 전", 일주일이 넘으면 "10월 21일"
export function timeAgo(date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
