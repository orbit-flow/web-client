import api from './axios';

// 최상위 댓글(대댓글은 replyCount만) → PageResponse<CommentResponse>
export async function getComments(postId, { page = 1, size = 50, order = 'ASC' } = {}) {
  const response = await api.get(`/posts/${postId}/comments`, { params: { page, size, order } });
  return response.data.data;
}

export async function getReplies(commentId, { page = 1, size = 50, order = 'ASC' } = {}) {
  const response = await api.get(`/comments/${commentId}/replies`, { params: { page, size, order } });
  return response.data.data;
}

// parentCommentId가 있으면 대댓글(한 단계까지)
export async function createComment(postId, { content, parentCommentId }) {
  const response = await api.post(`/posts/${postId}/comments`, { content, parentCommentId });
  return response.data.data;
}

// 댓글 작성자만. 응답의 replyCount는 늘 0이라 목록 값을 다시 받아 쓴다
export async function updateComment(commentId, { content }) {
  const response = await api.put(`/comments/${commentId}`, { content });
  return response.data.data;
}

// 댓글 작성자 또는 게시글 작성자만. 최상위 댓글을 지우면 대댓글도 함께
export async function deleteComment(commentId) {
  await api.delete(`/comments/${commentId}`);
}
