import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyUuid } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import { acceptFollow, getFollowRequests, removeFollower, toggleBlock } from '../api/follow';
import { getTimeline } from '../api/post';
import { MobileTopBarActions } from '../components/layout/MobileTopBar';
import { PersonRow } from '../components/social/PersonRow';
import { PostCard } from '../components/social/PostCard';
import { PostDetailModal } from '../components/social/PostDetailModal';
import { ReportModal } from '../components/social/ReportModal';
import { Badge } from '../components/ui/Badge';
import { EmptyHint } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { fromTimeline } from '../utils/post';
import { parseLocal, timeAgo } from '../utils/date';
import { showErrorToast } from '../utils/errorToast';
import imageIcon from '../assets/icons/image.svg';
import usersIcon from '../assets/icons/users.svg';
import { useReload } from '../hooks/useReload';

const PAGE_SIZE = 20;

// 팔로우한 사람들의 글(개인 카테고리, 전체·팔로워 공개만) + 받은 팔로우 요청
export function TimelinePage() {
  const navigate = useNavigate();
  const [myUuid, setMyUuid] = useState(null);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [requests, setRequests] = useState({ content: [], totalElements: 0 });
  const [searchParams, setSearchParams] = useSearchParams();
  // 연 게시글은 주소(?post=id)에 담아 새로고침해도 그대로 떠 있게 한다(알림 화면과 같은 방식)
  const openPostId = Number(searchParams.get('post')) || null;
  const setOpenPostId = (id) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('post', String(id));
      else next.delete('post');
      return next;
    });
  const [report, setReport] = useState(null);
  const { reloadKey, reload } = useReload();


  useEffect(() => {
    let ignore = false;
    Promise.all([getMyUuid(), getTimeline({ page: 1, size: PAGE_SIZE }), getFollowRequests({ size: 3 })])
      .then(([uuid, timeline, requestPage]) => {
        if (ignore) return;
        setMyUuid(uuid);
        setPosts(timeline.content.map(fromTimeline));
        setPage(1);
        setHasMore(timeline.totalPages > 1);
        setRequests(requestPage);
      })
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '타임라인을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const loadMore = async () => {
    try {
      const next = await getTimeline({ page: page + 1, size: PAGE_SIZE });
      setPosts((prev) => [...prev, ...next.content.map(fromTimeline)]);
      setPage(page + 1);
      setHasMore(page + 1 < next.totalPages);
    } catch (err) {
      showErrorToast(getErrorMessage(err, '더 불러오지 못했어요.'));
    }
  };

  const run = async (task, fallback) => {
    try {
      await task();
      reload();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    }
  };

  const postMenu = (post) => [
    {
      label: '신고',
      onClick: () =>
        setReport({
          contentType: 'POST',
          targetId: post.id,
          description: `${post.author.nickname}님의 게시글 "${post.todo.name}"를 신고해요`,
          blockUuid: post.author.uuid,
        }),
    },
    { label: '차단', danger: true, onClick: () => run(() => toggleBlock(post.author.uuid), '차단하지 못했어요.') },
  ];

  // 내 팔로잉 버튼: 받은 팔로우 요청이 있으면 개수
  const followingButton = (
    <Button variant="neutral" size="md" iconLeft={usersIcon} onClick={() => navigate('/friends')}>
      내 팔로잉
      {requests.totalElements > 0 && (
        <Badge tone="danger" solid>
          {requests.totalElements > 99 ? '99+' : requests.totalElements}
        </Badge>
      )}
    </Button>
  );

  return (
    <div className="page timeline-page">
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">타임라인</h1>
          <p className="page__subtitle">팔로우한 사람들이 할 일을 하며 남긴 글이에요</p>
        </div>
        {followingButton}
      </header>

      {/* 모바일은 화면 머리 대신 상단바 오른쪽 */}
      <MobileTopBarActions>{followingButton}</MobileTopBarActions>

      <div className="timeline-page__columns">
        <div className="timeline-page__feed">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showAuthor menuItems={postMenu(post)} onOpen={() => setOpenPostId(post.id)} />
          ))}
          {posts.length === 0 && (
            <EmptyHint icon={imageIcon} title="아직 볼 글이 없어요" description="친구를 팔로우하면 그 사람이 할 일을 하며 남긴 글이 여기에 보여요">
              <Button variant="secondary" dense onClick={() => navigate('/friends')}>
                친구 찾기
              </Button>
            </EmptyHint>
          )}
          {hasMore && (
            <Button variant="neutral" onClick={loadMore} className="timeline-page__more">
              더 보기
            </Button>
          )}
        </div>

        <aside className="timeline-page__side">
          <section className="timeline-page__requests" aria-label="받은 팔로우 요청">
            <div className="section-header">
              <h2 className="section-header__title">받은 팔로우 요청</h2>
              <Badge>{requests.totalElements}</Badge>
              <span className="board-column__spacer" />
              <Button variant="ghost" dense onClick={() => navigate('/friends?tab=requests')}>
                모두 보기
              </Button>
            </div>
            {requests.content.length > 0 ? (
              <div className="people-list">
                {requests.content.map((request) => (
                  <PersonRow key={request.followId} {...request} avatarSize="sm" subtitle={timeAgo(parseLocal(request.followAt))}>
                    <Button size="sm" onClick={() => run(() => acceptFollow(request.followId), '수락하지 못했어요.')}>
                      수락
                    </Button>
                    <Button variant="neutral" size="sm" onClick={() => run(() => removeFollower(request.followId), '거절하지 못했어요.')}>
                      거절
                    </Button>
                  </PersonRow>
                ))}
              </div>
            ) : (
              <p className="page__empty">받은 요청이 없어요</p>
            )}
          </section>
          <p className="notice-box">
            타임라인에는 전체 공개 · 팔로워 공개 카테고리의 글만 보여요. 내 글과 팀 글은 대시보드 &quot;포스트&quot; 탭에서 볼 수 있어요.
          </p>
        </aside>
      </div>

      {openPostId && (
        <PostDetailModal
          postId={openPostId}
          myUuid={myUuid}
          fallbackCategory={posts.find((post) => post.id === openPostId)?.todo}
          onClose={() => setOpenPostId(null)}
          onChanged={reload}
        />
      )}
      {report && <ReportModal target={report} onClose={() => setReport(null)} onBlocked={reload} />}
    </div>
  );
}
