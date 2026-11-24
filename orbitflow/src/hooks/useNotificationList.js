import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/axios';
import { acceptFollow, getFollowRequests, removeFollower } from '../api/follow';
import { deleteNotification, getNotifications, readAllNotifications, readNotification } from '../api/notification';
import { showErrorToast } from '../utils/errorToast';
import { isPostNotification, notificationPath } from '../utils/notification';
import { useRealtime } from './useRealtime';
import { useReload } from './useReload';

async function fetchList(unreadOnly, size) {
  const [page, requests] = await Promise.all([
    getNotifications({ unreadOnly, size }),
    getFollowRequests({ size: 100 }).catch(() => ({ content: [] })),
  ]);
  return { items: page.content, pendingFollowIds: new Set(requests.content.map((request) => request.followId)) };
}

// 알림 목록(페이지·사이드바 팝오버 공용): 불러오기, 새 알림 앞에 붙이기, 읽음·삭제·팔로우 요청 수락/거절, 누르면 이동
// onOpenPost(postId): 게시글 알림을 누르면 부른다(상세 모달은 부르는 쪽에서)
export function useNotificationList({ unreadOnly = false, size = 50, onOpenPost } = {}) {
  const navigate = useNavigate();
  const { onNotification, setNotificationUnread, refreshNotificationUnread } = useRealtime();
  const [items, setItems] = useState(null);
  const [pendingFollowIds, setPendingFollowIds] = useState(() => new Set());
  // loadFailed: 처음 불러오기가 실패했는지(목록 자리에 안내를 남기려고). 문구는 오류 토스트로
  const { reloadKey, reload: reloadList, loadFailed, setLoadFailed } = useReload();

  useEffect(() => {
    let ignore = false;
    fetchList(unreadOnly, size)
      .then((loaded) => {
        if (ignore) return;
        setLoadFailed(false);
        setItems(loaded.items);
        setPendingFollowIds(loaded.pendingFollowIds);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadFailed(true);
        showErrorToast(getErrorMessage(err, '알림을 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [unreadOnly, size, reloadKey, setLoadFailed]);

  // 실시간 새 알림은 맨 앞에. 팔로우 요청이면 수락·거절 버튼을 위해 요청 목록도 다시 받는다
  useEffect(
    () =>
      onNotification((notification) => {
        setItems((prev) => (prev ? [notification, ...prev.filter((item) => item.id !== notification.id)].slice(0, size) : prev));
        if (notification.type === 'SOCIAL') {
          getFollowRequests({ size: 100 })
            .then((requests) => setPendingFollowIds(new Set(requests.content.map((request) => request.followId))))
            .catch(() => {});
        }
      }),
    [onNotification, size],
  );

  const run = async (task, fallback) => {
    try {
      await task();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    }
  };

  const markRead = (notification) =>
    run(async () => {
      if (notification.isRead) return;
      await readNotification(notification.id);
      setItems((prev) => prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
      setNotificationUnread((count) => Math.max(0, count - 1));
    }, '읽음으로 바꾸지 못했어요.');

  const open = (notification) => {
    markRead(notification);
    if (isPostNotification(notification)) onOpenPost?.(notification.targetId);
    else navigate(notificationPath(notification));
  };

  const answerFollow = (notification, accept) =>
    run(async () => {
      await (accept ? acceptFollow(notification.targetId) : removeFollower(notification.targetId));
      setPendingFollowIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.targetId);
        return next;
      });
      await markRead(notification);
    }, accept ? '수락하지 못했어요.' : '거절하지 못했어요.');

  const remove = (notification) =>
    run(async () => {
      await deleteNotification(notification.id);
      setItems((prev) => prev.filter((item) => item.id !== notification.id));
      if (!notification.isRead) setNotificationUnread((count) => Math.max(0, count - 1));
    }, '알림을 지우지 못했어요.');

  const readAll = () =>
    run(async () => {
      await readAllNotifications();
      setItems((prev) => (unreadOnly ? [] : prev?.map((item) => ({ ...item, isRead: true }))));
      setNotificationUnread(0);
    }, '모두 읽음으로 바꾸지 못했어요.');

  const reload = useCallback(() => {
    reloadList();
    refreshNotificationUnread();
  }, [reloadList, refreshNotificationUnread]);

  return {
    items,
    loadFailed,
    isPendingFollow: (notification) => notification.type === 'SOCIAL' && pendingFollowIds.has(notification.targetId),
    open,
    markRead,
    accept: (notification) => answerFollow(notification, true),
    reject: (notification) => answerFollow(notification, false),
    remove,
    readAll,
    reload,
  };
}
