import api, { MULTIPART } from './axios';

// 팔로우한 사람들의 개인 카테고리 게시글(PUBLIC·FOLLOWER) → PageResponse<TimelineResponse>
export async function getTimeline({ page = 1, size = 20 } = {}) {
  const response = await api.get('/timeline', { params: { page, size } });
  return response.data.data;
}

// 사용자가 쓴 글 중 내가 볼 수 있는 것 → PageResponse<PostResponse>
export async function getUserPosts(userUuid, { page = 1, size = 20 } = {}) {
  const response = await api.get(`/users/${userUuid}/posts`, { params: { page, size } });
  return response.data.data;
}

// 팀 게시글 탭: 팀 카테고리 할 일에 쓴 글 중 내가 볼 수 있는 것 → PageResponse<PostResponse>
export async function getTeamPosts(teamUuid, { page = 1, size = 20 } = {}) {
  const response = await api.get(`/teams/${teamUuid}/posts`, { params: { page, size } });
  return response.data.data;
}

// 할 일에 달린 글 → PageResponse<PostResponse>
export async function getTodoPosts(todoId, { page = 1, size = 10 } = {}) {
  const response = await api.get(`/todos/${todoId}/posts`, { params: { page, size } });
  return response.data.data;
}

export async function getPost(postId) {
  const response = await api.get(`/posts/${postId}`);
  return response.data.data;
}

// multipart: request(JSON 파트) + images(여러 개, 최대 3장, 올린 순서가 표시 순서)
function postForm(request, images) {
  const form = new FormData();
  form.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  for (const image of images) form.append('images', image);
  return form;
}

export async function createPost(todoId, { content, images }) {
  const response = await api.post(`/todos/${todoId}/posts`, postForm({ content }, images), MULTIPART);
  return response.data.data;
}

// 전체 교체: keepImageUrls(남길 기존 사진, 표시 순서) 뒤에 새 images가 붙는다
export async function updatePost(postId, { content, keepImageUrls, images }) {
  const response = await api.put(`/posts/${postId}`, postForm({ content, keepImageUrls }, images), MULTIPART);
  return response.data.data;
}

export async function deletePost(postId) {
  await api.delete(`/posts/${postId}`);
}

// 누를 때마다 좋아요 ↔ 취소 → { postId, liked, likeCount }
export async function togglePostLike(postId) {
  const response = await api.post(`/posts/${postId}/likes`);
  return response.data.data;
}

// 좋아요 누른 사람(최신순) → PageResponse<LikerResponse>
export async function getPostLikers(postId, { page = 1, size = 2 } = {}) {
  const response = await api.get(`/posts/${postId}/likes`, { params: { page, size } });
  return response.data.data;
}
