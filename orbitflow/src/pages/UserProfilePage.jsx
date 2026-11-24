import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getMyUuid, getUserAvatar } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import { getUserCategories } from '../api/category';
import { getDashboardBoard } from '../api/todo';
import { getFollowers, toggleBlock, toggleFollow } from '../api/follow';
import { getUserPosts } from '../api/post';
import { getUserProfile } from '../api/user';
import { AvatarPreview } from '../components/avatar/AvatarPreview';
import { DashboardBoard } from '../components/dashboard/DashboardBoard';
import { DashboardToolbar } from '../components/dashboard/DashboardToolbar';
import { MiniCalendar } from '../components/dashboard/MiniCalendar';
import { MobileTopBarTitle } from '../components/layout/MobileTopBar';
import { FollowButton } from '../components/social/FollowButton';
import { PostCard } from '../components/social/PostCard';
import { PostDetailModal } from '../components/social/PostDetailModal';
import { ReportModal } from '../components/social/ReportModal';
import { AvatarSlot } from '../components/ui/AvatarSlot';
import { Button } from '../components/ui/Button';
import { EmptyHint, Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { LevelBadge } from '../components/ui/LevelBadge';
import { Menu } from '../components/ui/Menu';
import { Tabs } from '../components/ui/Tabs';
import { fromPost } from '../utils/post';
import { addMonths } from '../utils/date';
import { ITEM_TYPES } from '../utils/avatar';
import { useBoardCalendar } from '../hooks/useBoardCalendar';
import { MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { boardRangeTitle, groupTodos } from '../utils/todo';
import { showErrorToast } from '../utils/errorToast';
import messageIcon from '../assets/icons/message.svg';
import imageIcon from '../assets/icons/image.svg';
import lockIcon from '../assets/icons/lock.svg';
import moreIcon from '../assets/icons/more.svg';
import { useReload } from '../hooks/useReload';

// 사용자 프로필: 머리(사진·레벨·소개·숫자·팔로우) + 게시글 / 대시보드 탭(대시보드는 보기만)
// 비공개 계정을 팔로우하지 않았으면 잠금 안내, 상대가 나를 차단했으면 볼 수 없음
export function UserProfilePage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // 고른 탭도 주소(?tab=)에 담아 새로고침해도 그대로 둔다. 기본(대시보드)이면 주소에서 뺀다
  const tab = searchParams.get('tab') === 'posts' ? 'posts' : 'dashboard';
  const setTab = (value) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === 'dashboard') next.delete('tab');
      else next.set('tab', value);
      return next;
    });
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
  const [failed, setFailed] = useState(false);
  const { reloadKey, reload } = useReload();


  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const myUuid = await getMyUuid();
        // 내 uuid로 들어오면 내 홈(대시보드)으로
        if (myUuid === uuid) {
          if (!ignore) navigate('/home', { replace: true });
          return;
        }
        const profile = await getUserProfile(uuid);
        // 비공개 계정은 팔로워 목록이 FOLLOW_LIST_FORBIDDEN(403)이라 이걸로 잠금 여부를 안다
        const locked = await getFollowers(uuid, { size: 1 })
          .then(() => false)
          .catch((err) => err.response?.status === 403);
        const [avatar, posts, categories] = await Promise.all([
          getUserAvatar(uuid).catch(() => null),
          locked ? null : getUserPosts(uuid),
          locked ? [] : getUserCategories(uuid),
        ]);
        if (ignore) return;
        setData({ myUuid, profile, locked, avatar, level: avatar?.level.level, posts, categories });
      } catch (err) {
        if (ignore) return;
        setFailed(true);
        showErrorToast(
          err.response?.status === 403
            ? '이 프로필은 볼 수 없어요'
            : getErrorMessage(err, '프로필을 불러오지 못했어요.'),
        );
      }
    })();
    return () => {
      ignore = true;
    };
  }, [uuid, reloadKey, navigate]);

  const categoriesById = useMemo(() => new Map((data?.categories ?? []).map((category) => [category.id, category])), [data]);

  const run = async (task, fallback) => {
    try {
      await task();
      reload();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    }
  };

  if (!data) {
    return (
      <div className="page">
        <p className="page__empty">{failed ? '프로필을 보여 줄 수 없어요' : '불러오는 중이에요'}</p>
      </div>
    );
  }

  const { myUuid, profile, locked, avatar, level, posts } = data;
  const follow = () => run(() => toggleFollow(profile.uuid), '팔로우를 바꾸지 못했어요.');

  return (
    <div className="page profile-page">
      {/* 모바일 상단바는 "프로필", 이름은 사진 옆에 */}
      <MobileTopBarTitle>프로필</MobileTopBarTitle>
      <section className="profile-header" aria-label="프로필">
        <AvatarSlot src={profile.profileImage} size="xl" />
        <div className="profile-header__info">
          <div className="profile-header__name-row">
            <h1 className="profile-header__name">{profile.nickname}</h1>
            {level != null && <LevelBadge level={level} />}
            <span className="board-column__spacer" />
            <div className="profile-header__actions">
              {!profile.blockedByMe && <FollowButton state={profile.followState} followerState={profile.followerState} onClick={follow} />}
              <Button variant="neutral" dense iconLeft={messageIcon} onClick={() => navigate('/chats', { state: { userUuid: profile.uuid } })}>
                메시지
              </Button>
              <Menu
                label="프로필 메뉴"
                items={[
                  {
                    label: profile.blockedByMe ? '차단 해제' : '차단',
                    danger: !profile.blockedByMe,
                    onClick: () => run(() => toggleBlock(profile.uuid), '차단을 바꾸지 못했어요.'),
                  },
                  {
                    label: '신고',
                    onClick: () =>
                      setReport({
                        contentType: 'USER',
                        targetUserUuid: profile.uuid,
                        description: `${profile.nickname}님을 신고해요`,
                        blockUuid: profile.blockedByMe ? undefined : profile.uuid,
                      }),
                  },
                ]}
              />
            </div>
          </div>
          {profile.introduce && <p className="profile-header__intro">{profile.introduce}</p>}
          <div className="profile-header__stats num">
            {posts && (
              <span>
                <strong>{posts.totalElements}</strong> 게시글
              </span>
            )}
            <span>
              <strong>{profile.followerCount}</strong> 팔로워
            </span>
            <span>
              <strong>{profile.followingCount}</strong> 팔로잉
            </span>
          </div>
        </div>
      </section>

      <Tabs
        items={[
          { value: 'dashboard', label: '대시보드' },
          { value: 'posts', label: '게시글', count: posts?.totalElements },
        ]}
        value={tab}
        onChange={setTab}
        label="프로필 보기"
      />

      {locked ? (
        <div className="empty-state empty-state--card">
          <Icon src={lockIcon} size={32} />
          <p className="empty-state__title">비공개 계정이에요</p>
          <p className="empty-state__desc">팔로우 요청이 수락되면 게시글과 대시보드를 볼 수 있어요</p>
          {profile.followState === 'PENDING' ? (
            <Button variant="neutral" dense onClick={follow}>
              요청 취소
            </Button>
          ) : (
            <Button dense onClick={follow}>
              팔로우 요청
            </Button>
          )}
        </div>
      ) : tab === 'posts' ? (
        posts.content.length > 0 ? (
          <div className="post-grid">
            {posts.content.map((post) => (
              <PostCard key={post.id} post={fromPost(post, categoriesById)} onOpen={() => setOpenPostId(post.id)} />
            ))}
          </div>
        ) : (
          <EmptyHint icon={imageIcon} title="아직 볼 수 있는 게시글이 없어요" />
        )
      ) : (
        <ProfileDashboard userUuid={profile.uuid} nickname={profile.nickname} avatar={avatar} categoriesById={categoriesById} />
      )}

      {openPostId && (
        <PostDetailModal
          postId={openPostId}
          myUuid={myUuid}
          categoriesById={categoriesById}
          onClose={() => setOpenPostId(null)}
          onChanged={reload}
        />
      )}
      {report && <ReportModal target={report} onClose={() => setReport(null)} onBlocked={reload} />}
    </div>
  );
}

// 프로필의 대시보드 탭: 맨 위에 이 사용자의 아바타(입은 아이템을 겹친 캐릭터), 그 아래 개인 카테고리 중 내가 볼 수 있는 것의 일정·백로그를 일·주·월로 보기만 한다
// 주간 · 월간 칸을 한 번 누르면 그날을 고르고, 두 번 누르면 그날 일간. 백로그는 일간이면 옆에 펼치고, 주간 · 월간이면 접힌 막대
function ProfileDashboard({ userUuid, nickname, avatar, categoriesById }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [view, setView] = useState('week');
  const [board, setBoard] = useState({ schedules: [], backlogs: [] });
  const [backlogCollapsed, setBacklogCollapsed] = useState(true);
  const [mobileTab, setMobileTab] = useState('todos'); // 모바일은 옆 백로그 칸이 없어 일정 · 백로그를 탭으로 나눈다(내 대시보드와 같음)
  // 달력 점: 그 달 칸에 걸친 할 일이 있는 날(내 대시보드와 같은 방식)
  const loadRange = useCallback((range) => getDashboardBoard(userUuid, range, []), [userUuid]);
  const { baseDate, calendarMonth, setCalendarMonth, range, eventDays, goTo, move, openDay } = useBoardCalendar({ view, setView, loadRange });
  const showTodos = !isMobile || mobileTab === 'todos';
  const showBacklog = !isMobile || mobileTab === 'backlog';

  useEffect(() => {
    let ignore = false;
    getDashboardBoard(userUuid, range, [])
      .then((loaded) => !ignore && setBoard(loaded))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '대시보드를 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [userUuid, range]);

  const schedules = groupTodos(board.schedules);
  const backlogs = groupTodos(board.backlogs);

  return (
    <section className="profile-dashboard" aria-label="대시보드">
      {/* 위: 아바타 카드 + 오른쪽 달력(내 대시보드와 같은 배치, 모바일은 달력 없이) */}
      <div className="profile-dashboard__top">
        {avatar && <ProfileAvatarCard nickname={nickname} items={avatar.equippedItems} />}
        {!isMobile && (
          <MiniCalendar
            month={calendarMonth}
            selected={baseDate}
            eventDays={eventDays}
            onMonthChange={(diff) => setCalendarMonth((prev) => addMonths(prev, diff))}
            onSelect={openDay}
            onToday={() => goTo(new Date())}
          />
        )}
      </div>
      <DashboardToolbar
        title={boardRangeTitle(view, range, baseDate)}
        view={view}
        onViewChange={setView}
        onPrev={() => move(-1)}
        onNext={() => move(1)}
        onToday={() => goTo(new Date())}
      />
      {isMobile && (
        <Tabs
          items={[
            { value: 'todos', label: '일정', count: schedules.length },
            { value: 'backlog', label: '백로그', count: backlogs.length },
          ]}
          value={mobileTab}
          onChange={setMobileTab}
          label="대시보드 보기"
        />
      )}
      <DashboardBoard
        tabbed={isMobile}
        view={view}
        range={range}
        baseDate={baseDate}
        schedules={schedules}
        backlogs={backlogs}
        categoriesById={categoriesById}
        showTodos={showTodos}
        showBacklog={showBacklog}
        backlogCollapsible={!isMobile && view !== 'day'}
        backlogCollapsed={backlogCollapsed}
        onBacklogCollapsedChange={setBacklogCollapsed}
        onSelectDate={goTo}
        onOpenDate={openDay}
      />
    </section>
  );
}

// 아바타 카드: 가운데 아바타 그림, 오른쪽 위 … 를 누르면 입은 아이템을 부위별로(부위 순서 = 아바타 화면 탭 순서) 펼쳐 보여 준다
// 바깥을 누르거나 Esc면 닫힌다
function ProfileAvatarCard({ nickname, items }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const worn = ITEM_TYPES.map((type) => ({ type, item: items.find((item) => item.type === type.value) })).filter(({ item }) => item);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', closeOnOutside);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('mousedown', closeOnOutside);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div className="profile-avatar" ref={rootRef} aria-label={`${nickname}님의 아바타`}>
      <AvatarPreview items={items} className="profile-avatar__figure" />
      <div className="profile-avatar__more">
        <IconButton icon={moreIcon} label="입은 아이템 보기" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((prev) => !prev)} />
        {open && (
          <div className="profile-avatar__items" role="dialog" aria-label="입은 아이템">
            <p className="profile-avatar__items-title">입은 아이템</p>
            {worn.length === 0 ? (
              <p className="profile-avatar__items-empty">입은 아이템이 없어요</p>
            ) : (
              <ul className="profile-avatar__list">
                {worn.map(({ type, item }) => (
                  <li key={type.value} className="profile-avatar__row">
                    <span className="profile-avatar__part">{type.label}</span>
                    <span className="profile-avatar__swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
                    <span className="profile-avatar__name">{item.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
