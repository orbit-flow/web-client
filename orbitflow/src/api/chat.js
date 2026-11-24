import api from './axios';

const dataOf = (response) => response.data.data;

// → PageResponse<ChatroomResponse> (마지막 메시지 최신순, lastMessage·unreadCount 포함)
export async function getChatrooms({ page = 1, size = 100 } = {}) {
  return dataOf(await api.get('/chatrooms', { params: { page, size } }));
}

// 팀 채팅방 만들기. 참여자 = userUuids + roleIds 역할을 가진 구성원(나 빼고 2명 이상)
export async function createTeamChatroom(teamUuid, { title, userUuids, roleIds }) {
  return dataOf(await api.post(`/teams/${teamUuid}/chatrooms`, { title, userUuids, roleIds }));
}

// 팀 1:1 대화 열기(이미 있으면 그 방)
export async function openTeamDirectChat(teamUuid, userUuid) {
  return dataOf(await api.post(`/teams/${teamUuid}/chatrooms/direct`, { userUuid }));
}

// → PageResponse<ChatroomMemberResponse>
export async function getChatroomMembers(chatroomUuid) {
  return dataOf(await api.get(`/chatrooms/${chatroomUuid}/members`, { params: { size: 100 } }));
}

// → PageResponse<MessageResponse> (id 내림차순). beforeId 미만만
export async function getMessages(chatroomUuid, { beforeId, page = 1, size = 30 } = {}) {
  return dataOf(await api.get(`/chatrooms/${chatroomUuid}/messages`, { params: { beforeId, page, size } }));
}

// clientMessageId가 같으면 다시 보내도 한 번만 저장된다
export async function sendMessage(chatroomUuid, content, clientMessageId = crypto.randomUUID()) {
  return dataOf(await api.post(`/chatrooms/${chatroomUuid}/messages`, { content, clientMessageId }));
}

export async function markChatroomRead(chatroomUuid) {
  await api.patch(`/chatrooms/${chatroomUuid}/read`);
}

export async function leaveChatroom(chatroomUuid) {
  await api.delete(`/chatrooms/${chatroomUuid}/members/me`);
}

// 개인 1:1 대화 열기(없으면 만들고, 나갔던 방이면 다시 참여)
export async function openDirectChat(userUuid) {
  return dataOf(await api.post('/chatrooms/direct', { userUuid }));
}

// 개인 그룹 대화(나 빼고 2명 이상)
export async function createGroupChat({ title, userUuids }) {
  return dataOf(await api.post('/chatrooms/group', { title, userUuids }));
}

export async function getChatroom(chatroomUuid) {
  return dataOf(await api.get(`/chatrooms/${chatroomUuid}`));
}

// 1:1 방에 초대하면 새 그룹 방이 생긴다(응답 uuid가 다름)
export async function inviteToChatroom(chatroomUuid, userUuids) {
  return dataOf(await api.post(`/chatrooms/${chatroomUuid}/invite`, { userUuids }));
}

export async function setChatroomMuted(chatroomUuid, muted) {
  await api.patch(`/chatrooms/${chatroomUuid}/mute`, { muted });
}

// 내 화면에서만 쓰는 방 이름. 비우면 원래 이름으로 → 바뀐 ChatroomResponse(title은 보는 사람 기준으로 정해진 이름)
export async function setChatroomTitle(chatroomUuid, title) {
  return dataOf(await api.patch(`/chatrooms/${chatroomUuid}/title`, { title }));
}

// scope: ME 내 화면에서만 · ALL 전송 취소(보낸 사람만)
export async function deleteMessage(messageId, scope) {
  await api.delete(`/messages/${messageId}`, { data: { scope } });
}
