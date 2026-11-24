import { normalizeHex } from './color';
import {
  addDays,
  daysFromToday,
  formatDayTitle,
  formatMonthDay,
  formatTime,
  formatYearMonth,
  monthGrid,
  parseLocal,
  startOfWeek,
} from './date';
import { teamVisibilityKey } from './team';

// 대시보드 응답(평면 목록)을 최상위 + 자식으로 묶는다. 부모가 목록에 없는 자식은 최상위로 둔다
export function groupTodos(items) {
  const parents = items.filter((item) => !item.parentTodoId);
  const parentIds = new Set(parents.map((item) => item.id));
  const childrenByParent = new Map();
  const orphans = [];
  for (const item of items) {
    if (!item.parentTodoId) continue;
    if (!parentIds.has(item.parentTodoId)) {
      orphans.push(item);
      continue;
    }
    const list = childrenByParent.get(item.parentTodoId) ?? [];
    list.push(item);
    childrenByParent.set(item.parentTodoId, list);
  }
  return [...parents, ...orphans].map((item) => ({
    ...item,
    children: (childrenByParent.get(item.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

// 백로그 마감 배지: 지난 것 "지남"(danger), 오늘 "오늘"(warning), 나머지 "D-n"(neutral). 완료는 없음
export function dueBadge(todo) {
  if (todo.isCompleted) return null;
  const days = daysFromToday(parseLocal(todo.endDate));
  if (days < 0) return { label: '지남', tone: 'danger' };
  if (days === 0) return { label: '오늘', tone: 'warning' };
  return { label: `D-${days}`, tone: 'neutral' };
}

export function isOverdue(todo) {
  return !todo.isCompleted && parseLocal(todo.endDate) < new Date();
}

export const categoryColor = (color) => normalizeHex(color) ?? 'var(--neutral-400)';

// TaskItem에 넘길 값. categoriesById로 공개 범위를 찾는다. 팀 할 일이면 담당자도
export function toTaskItemProps(todo, categoriesById) {
  const start = parseLocal(todo.startDate);
  const end = parseLocal(todo.endDate);
  const schedule = todo.type === 'SCHEDULE';
  const category = categoriesById.get(todo.categoryId);
  return {
    type: schedule ? 'schedule' : 'backlog',
    title: todo.name,
    done: todo.isCompleted,
    preview: todo.preview,
    overdue: isOverdue(todo),
    startTime: formatTime(start),
    endTime: formatTime(end),
    period: `${formatMonthDay(start)} – ${formatMonthDay(end)}`,
    due: schedule ? null : dueBadge(todo),
    category: { name: todo.categoryName, color: categoryColor(todo.categoryColor) },
    visibility: category?.teamCategory ? teamVisibilityKey(category.visibility) : category?.visibility,
    assignee: todo.assigneeNickname ? { nickname: todo.assigneeNickname, profileImage: todo.assigneeProfileImage } : undefined,
    repeat: Boolean(todo.routineId),
    reminder: todo.remindBeforeMinutes != null,
    subtasks: (todo.children ?? []).map((child) => ({
      id: child.id,
      name: child.name,
      done: child.isCompleted,
      overdue: isOverdue(child),
      date: schedule ? null : formatMonthDay(parseLocal(child.endDate)),
    })),
  };
}

// 보기별 조회 기간(둘 다 포함). 월간은 달력 칸 전체(최대 42일)
export function boardRange(view, baseDate) {
  if (view === 'week') {
    const from = startOfWeek(baseDate);
    return { from, to: addDays(from, 6) };
  }
  if (view === 'month') {
    const days = monthGrid(baseDate);
    return { from: days[0], to: days[days.length - 1], days };
  }
  return { from: baseDate, to: baseDate };
}

export function boardRangeTitle(view, range, baseDate) {
  if (view === 'week') {
    const { from, to } = range;
    return `${from.getMonth() + 1}월 ${from.getDate()}일 – ${to.getMonth() + 1}월 ${to.getDate()}일`;
  }
  if (view === 'month') return formatYearMonth(baseDate);
  return formatDayTitle(baseDate);
}
