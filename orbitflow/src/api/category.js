import api from './axios';

// 내 개인 카테고리 전부(최신순). 한 페이지 최대 100개라 넘으면 이어서 받는다
export async function getMyCategories() {
  const all = [];
  for (let page = 1; ; page += 1) {
    const response = await api.get('/categories/me', { params: { page, size: 100 } });
    const data = response.data.data;
    all.push(...data.content);
    if (page >= data.totalPages) return all;
  }
}

// 다른 사용자의 개인 카테고리 중 내가 볼 수 있는 것
export async function getUserCategories(userUuid) {
  const response = await api.get(`/users/${userUuid}/categories`, { params: { size: 100 } });
  return response.data.data.content;
}

// 카테고리 하나(개인·팀 공통). 볼 수 없으면 CATEGORY_NOT_FOUND
export async function getCategory(categoryId) {
  const response = await api.get(`/categories/${categoryId}`);
  return response.data.data;
}

// body: { name, color(# 없는 6자리), visibility }
export async function createCategory(body) {
  const response = await api.post('/categories', body);
  return response.data.data;
}

export async function updateCategory(categoryId, body) {
  const response = await api.put(`/categories/${categoryId}`, body);
  return response.data.data;
}

// 소속 할 일·반복·게시글까지 영구 삭제
export async function deleteCategory(categoryId) {
  await api.delete(`/categories/${categoryId}`);
}

// → PageResponse<TodoResponse> (자식·반복 회차 포함 평면 목록)
export async function getCategoryTodos(categoryId, { page = 1, size = 100 } = {}) {
  const response = await api.get(`/categories/${categoryId}/todos`, { params: { page, size } });
  return response.data.data;
}
