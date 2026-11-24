import api from './axios';

// 내 개인 카테고리의 반복 일정 전부
export async function getMyRoutines() {
  const all = [];
  for (let page = 1; ; page += 1) {
    const response = await api.get('/routines/me', { params: { page, size: 100 } });
    const data = response.data.data;
    all.push(...data.content);
    if (page >= data.totalPages) return all;
  }
}

export async function getRoutine(routineId) {
  const response = await api.get(`/routines/${routineId}`);
  return response.data.data;
}

// body: { type, name, startDate, endDate, remindBeforeMinutes?, durationType, duration, daysOfWeek?, repeatEndDate? }
export async function createRoutine(categoryId, body) {
  const response = await api.post(`/categories/${categoryId}/routines`, body);
  return response.data.data;
}

// scope: ALL(완료한 회차까지) | INCOMPLETE(미완료 회차만). body는 categoryId 포함 전체 교체
export async function updateRoutine(routineId, scope, body) {
  const response = await api.put(`/routines/${routineId}`, body, { params: { scope } });
  return response.data.data;
}

// 완료한 회차는 일반 할 일로 남고 미완료 회차는 삭제
export async function deleteRoutine(routineId) {
  await api.delete(`/routines/${routineId}`);
}

// 미리보기 회차를 실제 할 일로 만든다. startDate는 미리보기 항목 값 그대로
export async function createOccurrence(routineId, startDate) {
  const response = await api.post(`/routines/${routineId}/occurrences`, { startDate });
  return response.data.data;
}
