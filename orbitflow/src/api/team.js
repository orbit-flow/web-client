import api, { MULTIPART } from './axios';
import { dashboardParams } from './todo';

const pageOf = (response) => response.data.data;
const dataOf = (response) => response.data.data;

// 페이지를 끝까지 이어 받는다(구성원·역할·카테고리처럼 한 화면에 다 그리는 목록)
async function getAll(url, params = {}) {
  const all = [];
  for (let page = 1; ; page += 1) {
    const data = pageOf(await api.get(url, { params: { ...params, page, size: 100 } }));
    all.push(...data.content);
    if (page >= data.totalPages) return all;
  }
}

/* ───────── 팀 ───────── */

// → TeamResponse[] (내가 소속된 팀, 생성 최신순)
export const getMyTeams = () => getAll('/teams');

// → PageResponse<DeletedTeamResponse> (내가 소유자였던, 삭제 후 30일 이내)
export async function getDeletedTeams() {
  return pageOf(await api.get('/teams/deleted', { params: { size: 100 } }));
}

// → TeamDetailResponse. 비구성원이면 통계·내 역할이 빠진다
export async function getTeam(teamUuid) {
  return dataOf(await api.get(`/teams/${teamUuid}`));
}

// body: { name, icon?, description?, isPrivate }
export async function createTeam(body) {
  return dataOf(await api.post('/teams', body));
}

// 전체 교체: description을 빼면 지워진다. 아이콘은 바뀌지 않음(uploadTeamIcon · deleteTeamIcon)
export async function updateTeam(teamUuid, body) {
  return dataOf(await api.put(`/teams/${teamUuid}`, body));
}

// 팀 아이콘 이미지 올리기 · 지우기(팀 관리 권한) → TeamResponse
export async function uploadTeamIcon(teamUuid, file) {
  const form = new FormData();
  form.append('image', file);
  return dataOf(await api.put(`/teams/${teamUuid}/icon`, form, MULTIPART));
}

export async function deleteTeamIcon(teamUuid) {
  return dataOf(await api.delete(`/teams/${teamUuid}/icon`));
}

// 팀 폼의 아이콘 변경을 서버에 반영: 새 파일을 골랐으면 올리고, 저장돼 있던 아이콘을 지웠으면 삭제
export async function syncTeamIcon(teamUuid, { icon, iconFile }, savedIcon) {
  if (iconFile) return uploadTeamIcon(teamUuid, iconFile);
  if (savedIcon && !icon) return deleteTeamIcon(teamUuid);
  return null;
}

export async function deleteTeam(teamUuid) {
  await api.delete(`/teams/${teamUuid}`);
}

export async function restoreTeam(teamUuid) {
  return dataOf(await api.post(`/teams/${teamUuid}/restore`));
}

// 공개 팀 찾기 → PageResponse<TeamSearchResponse>
export async function searchTeams(keyword, { page = 1, size = 20 } = {}) {
  return pageOf(await api.get('/search/teams', { params: { keyword, page, size } }));
}

/* ───────── 구성원 ───────── */

// → TeamMemberResponse[] (가입 최신순)
export const getTeamMembers = (teamUuid) => getAll(`/teams/${teamUuid}/members`);

// → TeamRoleResponse[] (우선순위 높은 순)
export const getMemberRoles = (teamUuid, userUuid) => getAll(`/teams/${teamUuid}/members/${userUuid}/roles`);

// 내 팀 프로필과 permissions(버튼 활성화 판단)
export async function getMyMembership(teamUuid) {
  return dataOf(await api.get(`/teams/${teamUuid}/members/me`));
}

// 두 필드를 함께 덮어쓴다(비우면 계정 값으로 표시)
export async function updateMyMembership(teamUuid, { nickname, email }) {
  return dataOf(await api.patch(`/teams/${teamUuid}/members/me`, { nickname, email }));
}

export async function uploadMyTeamImage(teamUuid, file) {
  const form = new FormData();
  form.append('image', file);
  return dataOf(
    await api.put(`/teams/${teamUuid}/members/me/profile-image`, form, MULTIPART),
  );
}

export async function deleteMyTeamImage(teamUuid) {
  return dataOf(await api.delete(`/teams/${teamUuid}/members/me/profile-image`));
}

export async function leaveTeam(teamUuid) {
  await api.delete(`/teams/${teamUuid}/members/me`);
}

export async function kickMember(teamUuid, userUuid) {
  await api.delete(`/teams/${teamUuid}/members/${userUuid}`);
}

// 역할을 roleIds로 통째로 교체
export async function setMemberRoles(teamUuid, userUuid, roleIds) {
  return dataOf(await api.put(`/teams/${teamUuid}/members/${userUuid}/roles`, { roleIds }));
}

export async function transferOwner(teamUuid, userUuid) {
  await api.patch(`/teams/${teamUuid}/owner`, { userUuid });
}

/* ───────── 블랙리스트 ───────── */

export const getBlacklist = (teamUuid) => getAll(`/teams/${teamUuid}/blacklist`);

export async function addToBlacklist(teamUuid, userUuid) {
  return dataOf(await api.post(`/teams/${teamUuid}/blacklist`, { userUuid }));
}

export async function removeFromBlacklist(teamUuid, userUuid) {
  await api.delete(`/teams/${teamUuid}/blacklist/${userUuid}`);
}

/* ───────── 역할 · 권한 ───────── */

export const getTeamRoles = (teamUuid) => getAll(`/teams/${teamUuid}/roles`);

export const getRoleMembers = (teamUuid, roleId) => getAll(`/teams/${teamUuid}/roles/${roleId}/members`);

// → CategoryRoleAccessResponse[] (팀의 모든 카테고리)
export const getRoleCategoryAccess = (teamUuid, roleId) => getAll(`/teams/${teamUuid}/roles/${roleId}/category-access`);

// body: { name, color?, priority, permissions, categoryAccess? }
export async function createRole(teamUuid, body) {
  return dataOf(await api.post(`/teams/${teamUuid}/roles`, body));
}

export async function updateRole(teamUuid, roleId, body) {
  return dataOf(await api.put(`/teams/${teamUuid}/roles/${roleId}`, body));
}

export async function deleteRole(teamUuid, roleId) {
  await api.delete(`/teams/${teamUuid}/roles/${roleId}`);
}

export async function setDefaultRole(teamUuid, roleId) {
  return dataOf(await api.patch(`/teams/${teamUuid}/roles/${roleId}/default`));
}

/* ───────── 초대 · 가입 신청 ───────── */

export const getSentInvitations = (teamUuid) => getAll(`/teams/${teamUuid}/invitations`);

export async function inviteUser(teamUuid, userUuid) {
  return dataOf(await api.post(`/teams/${teamUuid}/invitations`, { userUuid }));
}

export async function cancelInvitation(teamUuid, invitationUuid) {
  await api.delete(`/teams/${teamUuid}/invitations/${invitationUuid}`);
}

// 내가 받은 대기 중 초대
export const getMyInvitations = () => getAll('/team-invitations');

// 가입 신청 · 초대 수락에 보낼 팀 프로필: request(JSON { nickname, email }) + image(선택)
function teamProfileForm({ nickname, email }, image) {
  const form = new FormData();
  form.append('request', new Blob([JSON.stringify({ nickname, email })], { type: 'application/json' }));
  if (image) form.append('image', image);
  return form;
}

// 수락하면 이 팀 프로필로 바로 구성원이 된다
export async function acceptInvitation(invitationUuid, profile, image) {
  return dataOf(await api.post(`/team-invitations/${invitationUuid}/accept`, teamProfileForm(profile, image), MULTIPART));
}

export async function rejectInvitation(invitationUuid) {
  return dataOf(await api.post(`/team-invitations/${invitationUuid}/reject`));
}

// 팀 관리자가 승인하면 이 팀 프로필로 구성원이 된다
export async function requestJoin(teamUuid, profile, image) {
  return dataOf(await api.post(`/teams/${teamUuid}/join-requests`, teamProfileForm(profile, image), MULTIPART));
}

export async function cancelJoinRequest(teamUuid) {
  await api.delete(`/teams/${teamUuid}/join-requests/me`);
}

export const getJoinRequests = (teamUuid) => getAll(`/teams/${teamUuid}/join-requests`);

export async function acceptJoinRequest(requestUuid) {
  return dataOf(await api.post(`/team-join-requests/${requestUuid}/accept`));
}

export async function rejectJoinRequest(requestUuid) {
  return dataOf(await api.post(`/team-join-requests/${requestUuid}/reject`));
}

/* ───────── 팀 카테고리 · 대시보드 ───────── */

// → CategoryResponse[] (내가 볼 수 있는 팀 카테고리)
export const getTeamCategories = (teamUuid) => getAll(`/teams/${teamUuid}/categories`);

// body: { name, color, visibility } (비공개 팀은 PUBLIC 불가)
export async function createTeamCategory(teamUuid, body) {
  return dataOf(await api.post(`/teams/${teamUuid}/categories`, body));
}

// → CategoryProgressResponse { categoryId, total, completed, rate }
export async function getTeamCategoryProgress(teamUuid, categoryId) {
  return dataOf(await api.get(`/teams/${teamUuid}/categories/${categoryId}/progress`));
}

// → TeamDashboardTodoResponse[] (담당자 이름·사진 포함)
export async function getTeamSchedules(teamUuid, range) {
  return pageOf(await api.get(`/teams/${teamUuid}/dashboard/schedules`, dashboardParams(range))).content;
}

export async function getTeamBacklogs(teamUuid, range) {
  return pageOf(await api.get(`/teams/${teamUuid}/dashboard/backlogs`, dashboardParams(range))).content;
}
