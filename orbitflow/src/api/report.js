import api from './axios';

// contentType: POST(targetId=게시글) · COMMENT(targetId=댓글) · USER(targetUserUuid). reason 최대 255자
export async function createReport({ contentType, targetId, targetUserUuid, reason }) {
  const response = await api.post('/reports', { contentType, targetId, targetUserUuid, reason });
  return response.data.data;
}
