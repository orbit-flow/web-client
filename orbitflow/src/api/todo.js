import api from './axios';
import { toDateKey } from '../utils/date';

// 대시보드 기간 조회 공통 파라미터. from·to는 "2026-10-26"(둘 다 포함, 최대 42일), categoryIds는 생략하면 전체
export function dashboardParams({ from, to, categoryIds }) {
  const params = { from, to, size: 100 };
  if (categoryIds?.length) params.categoryIds = categoryIds.join(',');
  return { params };
}

// 사용자 대시보드(내 것 · 다른 사람 것 공통) → DashboardTodoResponse[]
// userUuid의 개인 카테고리 중 내가 볼 수 있는 것만(내 것이면 전부)
export async function getDashboardSchedules(userUuid, range) {
  const response = await api.get(`/users/${userUuid}/dashboard/schedules`, dashboardParams(range));
  return response.data.data.content;
}

export async function getDashboardBacklogs(userUuid, range) {
  const response = await api.get(`/users/${userUuid}/dashboard/backlogs`, dashboardParams(range));
  return response.data.data.content;
}

// 아직 만들어지지 않은 반복 회차(preview: true, id 없음)
export async function getDashboardPreviews(userUuid, range) {
  const response = await api.get(`/users/${userUuid}/dashboard/previews`, dashboardParams(range));
  return response.data.data.content;
}

// 기간({ from, to }: Date)의 일정·백로그·미리보기 회차를 한 번에 받아 유형별로 나눈다(일정은 시작 시각순)
export async function getDashboardBoard(userUuid, { from, to }, categoryIds) {
  const range = { from: toDateKey(from), to: toDateKey(to), categoryIds };
  const [schedules, backlogs, previews] = await Promise.all([
    getDashboardSchedules(userUuid, range),
    getDashboardBacklogs(userUuid, range),
    getDashboardPreviews(userUuid, range),
  ]);
  const byStart = (a, b) => a.startDate.localeCompare(b.startDate);
  return {
    schedules: [...schedules, ...previews.filter((item) => item.type === 'SCHEDULE')].sort(byStart),
    backlogs: [...backlogs, ...previews.filter((item) => item.type === 'BACKLOG')],
  };
}

export async function getTodo(todoId) {
  const response = await api.get(`/todos/${todoId}`);
  return response.data.data;
}

// body: { type, name, startDate, endDate, parentTodoId?, remindBeforeMinutes? }
export async function createTodo(categoryId, body) {
  const response = await api.post(`/categories/${categoryId}/todos`, body);
  return response.data.data;
}

// 전체 교체: remindBeforeMinutes를 빼면 리마인드 해제
export async function updateTodo(todoId, body) {
  const response = await api.put(`/todos/${todoId}`, body);
  return response.data.data;
}

// 부를 때마다 완료 ↔ 미완료가 뒤집힌다(멱등 아님)
export async function toggleTodoComplete(todoId) {
  const response = await api.patch(`/todos/${todoId}/complete`);
  return response.data.data;
}

export async function deleteTodo(todoId) {
  await api.delete(`/todos/${todoId}`);
}

// 자식 할 일 id 전체를 새 순서대로
export async function reorderChildTodos(parentTodoId, todoIds) {
  await api.patch(`/todos/${parentTodoId}/children/order`, { todoIds });
}

// 팀 할 일 담당자 바꾸기(할 일 맡기기 권한 필요)
export async function changeTodoAssignee(todoId, userUuid) {
  const response = await api.patch(`/todos/${todoId}/assignee`, { userUuid });
  return response.data.data;
}
