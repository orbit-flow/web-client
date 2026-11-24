import api, { MULTIPART } from './axios';

// → MyUserResponse
export async function getMe() {
  const response = await api.get('/users/me');
  return response.data.data;
}

// 다른 사용자 프로필 → UserProfileResponse { uuid, nickname, introduce?, profileImage?, followState, followerState, followerCount, followingCount, blockedByMe }
export async function getUserProfile(userUuid) {
  const response = await api.get(`/users/${userUuid}`);
  return response.data.data;
}

// 부분 수정이 아니다. nickname·introduce·isPrivate·allowNonFollowChatInvite를 모두 보낸다
export async function updateMe({ nickname, introduce, isPrivate, allowNonFollowChatInvite }) {
  const response = await api.patch('/users/me', { nickname, introduce, isPrivate, allowNonFollowChatInvite });
  return response.data.data;
}

export async function uploadProfileImage(file) {
  const form = new FormData();
  form.append('image', file);
  const response = await api.patch('/users/me/profile-image', form, MULTIPART);
  return response.data.data;
}

export async function deleteProfileImage() {
  const response = await api.delete('/users/me/profile-image');
  return response.data.data;
}

// 새 이메일로 받은 인증 토큰(verifyEmailCode)과 함께 보낸다
export async function changeEmail({ email, emailVerifyToken }) {
  const response = await api.patch('/users/me/email', { email, emailVerifyToken });
  return response.data.data;
}

// 소셜 전용 계정(hasPassword: false)의 첫 비밀번호
export async function setPassword(newPassword) {
  const response = await api.post('/users/me/password', { newPassword });
  return response.data.data;
}

// 다른 기기 세션은 모두 끊기고 이 기기에만 새 refresh 쿠키가 온다
export async function changePassword({ password, newPassword }) {
  const response = await api.patch('/users/me/password', { password, newPassword });
  return response.data.data;
}

// provider: GOOGLE · NAVER · KAKAO · GITHUB. 비밀번호가 없으면 마지막 로그인 수단이라 거부된다
export async function unlinkSocialAccount(provider) {
  await api.delete(`/users/me/oauth-accounts/${provider}`);
}

// confirmText: "{내 이름}계정 삭제에 동의합니다."
export async function deleteAccount(confirmText) {
  await api.delete('/users/me', { data: { confirmText } });
}
