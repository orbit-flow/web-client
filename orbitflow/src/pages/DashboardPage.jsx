import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../api/axios';
import { getMyAvatar, getMyUuid } from '../api/avatar';
import { getMyCategories } from '../api/category';
import { attend, getAttendanceToday } from '../api/point';
import { createOccurrence } from '../api/routine';
import { getDashboardBoard, getTodo, reorderChildTodos, toggleTodoComplete } from '../api/todo';
import { getMe } from '../api/user';
import { getUserPosts } from '../api/post';
import { PostCard } from '../components/social/PostCard';
import { PostDetailModal } from '../components/social/PostDetailModal';
import { fromPost } from '../utils/post';
import { CategoryFilter } from '../components/dashboard/CategoryFilter';
import { DashboardBoard } from '../components/dashboard/DashboardBoard';
import { DashboardToolbar } from '../components/dashboard/DashboardToolbar';
import { MiniCalendar } from '../components/dashboard/MiniCalendar';
import { ProfileCard } from '../components/dashboard/ProfileCard';
import { TodoDrawer } from '../components/dashboard/TodoDrawer';
import { WeekStrip } from '../components/dashboard/WeekStrip';
import { Tabs } from '../components/ui/Tabs';
import { addMonths, startOfDay } from '../utils/date';
import { boardRangeTitle, groupTodos } from '../utils/todo';
import { showErrorToast } from '../utils/errorToast';
import { celebrateLevelUp } from '../utils/levelUp';
import { EmptyHint } from '../components/ui/Icon';
import imageIcon from '../assets/icons/image.svg';
import { useBoardCalendar } from '../hooks/useBoardCalendar';
import { MOBILE_QUERY, TABLET_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useToast } from '../hooks/useRealtime';
import { useReload } from '../hooks/useReload';

const TABS = [
  { value: 'todos', label: '할 일' },
  { value: 'posts', label: '포스트' },
];

// 모바일은 옆 백로그 칸이 없어 탭으로 뺀다
const MOBILE_TABS = [
  { value: 'todos', label: '일정' },
  { value: 'backlog', label: '백로그' },
  { value: 'posts', label: '포스트' },
];

// 내 대시보드: 사용자 대시보드 API에 내 uuid
const loadBoard = async (range, categoryIds) => getDashboardBoard(await getMyUuid(), range, categoryIds);
// 미니 달력 점용: 카테고리 고르기와 무관하게 전체
const loadAll = (range) => loadBoard(range, []);

// 홈 대시보드: 프로필·달력 + 할 일 보드(일·주·월) + 할 일 드로어
// 모바일: 미니 달력 대신 카테고리 줄 아래 한 주 날짜 줄(일간일 때), 탭은 일정 · 백로그 · 포스트.
// 일·주·월 모두 도구줄 → 카테고리 줄 다음에 내용이 시작하도록 위치를 맞춘다
export function DashboardPage() {
  const toast = useToast();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const [categories, setCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [board, setBoard] = useState({ schedules: [], backlogs: [] });
  const [profile, setProfile] = useState(null);
  const [attended, setAttended] = useState(false);
  const [attending, setAttending] = useState(false);
  const [today, setToday] = useState({ done: 0, total: 0 });
  const [backlogCollapsed, setBacklogCollapsed] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [myPosts, setMyPosts] = useState({ content: [], totalElements: 0 });
  const { reloadKey, reload } = useReload();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedTodoId = Number(searchParams.get('todo')) || null;
  // 고른 탭·보기(일·주·월)도 주소(?tab=·?view=)에 담아 새로고침해도 그대로 둔다. 기본값이면 주소에서 뺀다
  const setParam = (key, value, fallback) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === fallback) next.delete(key);
      else next.set(key, value);
      return next;
    });
  const tab = MOBILE_TABS.some((item) => item.value === searchParams.get('tab')) ? searchParams.get('tab') : 'todos';
  const setTab = (value) => setParam('tab', value, 'todos');
  const view = ['week', 'month'].includes(searchParams.get('view')) ? searchParams.get('view') : 'day';
  const setView = (value) => setParam('view', value, 'day');
  // 연 게시글은 주소(?post=id)에 담아 새로고침해도 그대로 떠 있게 한다(알림 화면과 같은 방식)
  const openPostId = Number(searchParams.get('post')) || null;
  const setOpenPostId = (id) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('post', String(id));
      else next.delete('post');
      return next;
    });

  const { baseDate, calendarMonth, setCalendarMonth, range, eventDays, goTo, move, openDay } = useBoardCalendar({
    view,
    setView,
    loadRange: loadAll,
    reloadKey,
  });

  // 알림에서 넘어오면(?todo=id) 그 할 일 창을 연다. 팀 할 일이면 팀 화면에서 보도록 안내
  useEffect(() => {
    if (!linkedTodoId || categories.length === 0) return;
    let ignore = false;
    getTodo(linkedTodoId)
      .then((todo) => {
        if (ignore) return;
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('todo');
            return next;
          },
          { replace: true },
        );
        if (categories.some((category) => category.id === todo.categoryId)) {
          setDrawer({ todoId: todo.id });
        } else {
          toast('팀 할 일은 팀 화면에서 볼 수 있어요');
          navigate('/teams');
        }
      })
      .catch((err) => {
        if (ignore) return;
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('todo');
            return next;
          },
          { replace: true },
        );
        showErrorToast(getErrorMessage(err, '할 일을 열지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [linkedTodoId, categories, setSearchParams, navigate, toast]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  useEffect(() => {
    let ignore = false;
    Promise.all([getMe(), getMyAvatar(), getMyCategories(), getAttendanceToday()])
      .then(([me, avatar, myCategories, attendance]) => {
        if (ignore) return;
        setProfile({ uuid: avatar.userUuid, nickname: me.nickname, avatarItems: avatar.equippedItems, level: avatar.level, point: avatar.point });
        setCategories(myCategories);
        setAttended(attendance.attended);
        return getUserPosts(avatar.userUuid);
      })
      .then((posts) => !ignore && posts && setMyPosts(posts))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '내 정보를 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let ignore = false;
    loadBoard(range, selectedIds)
      .then((loaded) => !ignore && setBoard(loaded))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '할 일을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [range, selectedIds, reloadKey]);

  // 오늘 진행(최상위 할 일 기준)
  useEffect(() => {
    let ignore = false;
    const day = startOfDay(new Date());
    loadBoard({ from: day, to: day }, [])
      .then(({ schedules, backlogs }) => {
        if (ignore) return;
        const items = [...schedules, ...backlogs].filter((item) => !item.parentTodoId);
        setToday({ done: items.filter((item) => item.isCompleted).length, total: items.length });
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const run = async (task, fallback) => {
    try {
      await task();
      reload();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    }
  };

  // 미리보기 회차는 먼저 실제 할 일로 만든 뒤 다룬다
  const materialize = async (todo) => (todo.preview ? createOccurrence(todo.routineId, todo.startDate) : todo);

  const actions = {
    onToggle: (todo) =>
      run(async () => {
        const target = await materialize(todo);
        const updated = await toggleTodoComplete(target.id);
        if (updated?.isCompleted) toast('할 일을 완료했어요');
      }, '완료 표시를 바꾸지 못했어요.'),
    onOpen: async (todo) => {
      try {
        const target = await materialize(todo);
        if (todo.preview) reload();
        setDrawer({ todoId: target.id });
      } catch (err) {
        showErrorToast(getErrorMessage(err, '할 일을 열지 못했어요.'));
      }
    },
    onToggleSubtask: (id) => run(() => toggleTodoComplete(id), '완료 표시를 바꾸지 못했어요.'),
    onReorderSubtasks: (parentId, ids) => run(() => reorderChildTodos(parentId, ids), '순서를 바꾸지 못했어요.'),
  };

  const handleAttend = async () => {
    setAttending(true);
    await run(async () => {
      const result = await attend();
      toast(result?.leveledUp ? `출석 완료! 500P 적립 · Lv.${result.level.level} 달성` : '출석 완료! 500P가 적립됐어요');
      if (result?.leveledUp) celebrateLevelUp(result.level.level, result.levelUpReward?.amount);
    }, '출석하지 못했어요.');
    setAttending(false);
  };

  const toggleCategory = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const schedules = groupTodos(board.schedules);
  const backlogs = groupTodos(board.backlogs);
  // 모바일에서 백로그 탭을 보다가 넓어지면 할 일 탭으로
  const activeTab = !isMobile && tab === 'backlog' ? 'todos' : tab;
  // 모바일 "일정" 탭에도 개수(데스크톱 "할 일" 탭은 일정 · 백로그를 함께 보여 주므로 개수 없음)
  const tabCounts = { backlog: backlogs.length, posts: myPosts.totalElements, ...(isMobile && { todos: schedules.length }) };
  const showStrip = isMobile && view === 'day';

  return (
    <div className="page dashboard">
      <header className="page__header">
        <h1 className="page__title">대시보드</h1>
      </header>

      <div className="dashboard__top">
        {profile && (
          <ProfileCard
            {...profile}
            attended={attended}
            attending={attending}
            onAttend={handleAttend}
            today={today}
          />
        )}
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

      <Tabs
        items={(isMobile ? MOBILE_TABS : TABS).map((item) => (item.value in tabCounts ? { ...item, count: tabCounts[item.value] } : item))}
        value={activeTab}
        onChange={setTab}
        label="대시보드 보기"
      />

      {activeTab === 'posts' ? (
        <section className="dashboard-posts" aria-label="내 포스트">
          <div className="section-header">
            <h2 className="section-header__title">내 포스트</h2>
          </div>
          {myPosts.content.length > 0 ? (
            <div className="dashboard-posts__list">
              {myPosts.content.map((post) => (
                <PostCard key={post.id} post={fromPost(post, categoriesById)} onOpen={() => setOpenPostId(post.id)} />
              ))}
            </div>
          ) : (
            <EmptyHint icon={imageIcon} title="아직 쓴 글이 없어요" description={'할 일을 열어 "글 쓰기"로 남겨 보세요'} />
          )}
        </section>
      ) : (
        <>
          <DashboardToolbar
            title={boardRangeTitle(view, range, baseDate)}
            view={view}
            onViewChange={setView}
            onPrev={() => move(-1)}
            onNext={() => move(1)}
            onToday={() => goTo(new Date())}
            onAdd={() =>
              categories.length > 0
                ? setDrawer({ defaults: { date: baseDate } })
                : showErrorToast('할 일을 넣을 카테고리를 먼저 만들어 주세요(톱니 버튼).')
            }
          />
          <CategoryFilter
            categories={categories}
            selectedIds={selectedIds}
            onToggle={toggleCategory}
            onReset={() => setSelectedIds([])}
          />
          {showStrip && <WeekStrip selected={baseDate} eventDays={eventDays} onSelect={goTo} />}

          {/* 백로그: 데스크톱은 일정 옆 칸, 모바일은 백로그 탭에서만. 태블릿은 일간도 접힌 막대로 두고 펼치면 보드 위에 겹쳐 뜬다 */}
          <DashboardBoard
            tabbed={isMobile}
            view={view}
            range={range}
            baseDate={baseDate}
            schedules={schedules}
            backlogs={backlogs}
            categoriesById={categoriesById}
            actions={actions}
            showTodos={activeTab === 'todos'}
            showBacklog={!isMobile || activeTab === 'backlog'}
            backlogCollapsible={!isMobile && (isTablet || view !== 'day')}
            backlogCollapsed={backlogCollapsed}
            onBacklogCollapsedChange={setBacklogCollapsed}
            onSelectDate={goTo}
            onOpenDate={openDay}
          />
        </>
      )}

      {openPostId && (
        <PostDetailModal
          postId={openPostId}
          myUuid={profile?.uuid}
          categoriesById={categoriesById}
          onClose={() => setOpenPostId(null)}
          onChanged={reload}
        />
      )}
      {drawer && categories.length > 0 && (
        <TodoDrawer
          key={drawer.todoId ?? 'new'}
          todoId={drawer.todoId}
          defaults={drawer.defaults}
          categories={categories}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
