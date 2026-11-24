import api from './axios';

const dataOf = (response) => response.data.data;

// → PageResponse<NotificationResponse> (최신순, 30일 이내)
export async function getNotifications({ unreadOnly = false, page = 1, size = 50 } = {}) {
  return dataOf(await api.get('/notifications', { params: { unreadOnly, page, size } }));
}

export async function getUnreadNotificationCount() {
  return dataOf(await api.get('/notifications/unread-count'));
}

export async function readNotification(notificationId) {
  return dataOf(await api.patch(`/notifications/${notificationId}/read`));
}

export async function readAllNotifications() {
  await api.patch('/notifications/read-all');
}

export async function deleteNotification(notificationId) {
  await api.delete(`/notifications/${notificationId}`);
}
