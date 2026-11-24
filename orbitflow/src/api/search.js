import api from './axios';

// 닉네임 부분 일치 사용자 검색(나·나를 차단한 사람 제외) → PageResponse<UserSearchResponse>
export async function searchUsers(keyword, { page = 1, size = 20, sort = 'LATEST' } = {}) {
  const response = await api.get('/search/users', { params: { keyword, page, size, sort } });
  return response.data.data;
}
