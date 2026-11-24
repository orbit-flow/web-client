import api from './axios';

const listParams = ({ page = 1, size = 50, keyword } = {}) => ({ params: { page, size, keyword: keyword || undefined } });

// → PageResponse<FollowListResponse>. 비공개 계정을 팔로우하지 않았으면 403 FOLLOW_LIST_FORBIDDEN
export async function getFollowers(uuid, options) {
  const response = await api.get(`/follows/${uuid}/followers`, listParams(options));
  return response.data.data;
}

export async function getFollowings(uuid, options) {
  const response = await api.get(`/follows/${uuid}/followings`, listParams(options));
  return response.data.data;
}

// 내가 받은 대기 중 요청
export async function getFollowRequests(options) {
  const response = await api.get('/follows/requests', listParams(options));
  return response.data.data;
}

// 팔로우(공개는 바로 ACCEPTED, 비공개는 PENDING) ↔ 언팔로우·요청 철회 → { followId?, uuid, state }
export async function toggleFollow(uuid) {
  const response = await api.post(`/follows/${uuid}`);
  return response.data.data;
}

export async function acceptFollow(followId) {
  const response = await api.patch(`/follows/${followId}`);
  return response.data.data;
}

// 받은 요청 거절 또는 내 팔로워 삭제
export async function removeFollower(followId) {
  const response = await api.delete(`/follows/${followId}`);
  return response.data.data;
}

// 팔로우한 계정의 활동 알림 켜기 ↔ 끄기(현재 상태는 API로 알 수 없음)
export async function toggleFollowNotification(uuid) {
  const response = await api.patch(`/follows/${uuid}/notification`);
  return response.data.data;
}

// 차단 ↔ 해제 → { uuid, blocked }. 차단하면 양방향 팔로우가 모두 끊긴다
export async function toggleBlock(uuid) {
  const response = await api.post(`/blocks/${uuid}`);
  return response.data.data;
}

// 내가 차단한 사용자 → PageResponse<BlockListResponse> { uuid, nickname, profileImage?, blockedAt }
export async function getBlocks({ page = 1, size = 100, keyword } = {}) {
  const response = await api.get('/blocks', { params: { page, size, keyword: keyword || undefined } });
  return response.data.data;
}
