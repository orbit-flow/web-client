import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { getErrorMessage } from '../../api/axios';
import { getTeamBacklogs, getTeamSchedules } from '../../api/team';
import { reorderChildTodos, toggleTodoComplete } from '../../api/todo';
import { BacklogPanel } from '../dashboard/BacklogPanel';
import { BoardColumnHeader } from '../dashboard/BoardColumn';
import { CategoryFilter } from '../dashboard/CategoryFilter';
import { DashboardToolbar } from '../dashboard/DashboardToolbar';
import { MonthBoard } from '../dashboard/MonthBoard';
import { TodoDrawer } from '../dashboard/TodoDrawer';
import { TodoList } from '../dashboard/TodoList';
import { WeekBoard } from '../dashboard/WeekBoard';
import { ProgressBar } from '../ui/ProgressBar';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Tabs } from '../ui/Tabs';
import { addDays, addMonths, startOfDay, toDateKey } from '../../utils/date';
import { showErrorToast } from '../../utils/errorToast';
import { hasPermission } from '../../utils/team';
import { boardRange, boardRangeTitle, groupTodos } from '../../utils/todo';
import { MOBILE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { useToast } from '../../hooks/useRealtime';
import calendarIcon from '../../assets/icons/calendar.svg';
import { useReload } from '../../hooks/useReload';

const BACKLOG_SCOPES = [
  { value: 'all', label: '전체' },
  { value: 'mine', label: '내 담당' },
];

const byStart = (a, b) => a.startDate.localeCompare(b.startDate);

// 팀 메인 홈 탭: 개인 대시보드와 같은 보드 + 카테고리 완료율 카드 + 백로그 전체·내 담당
// selectedIds·onSelectedIdsChange는 카테고리 탭에서 "이 카테고리만 보기"로 넘어올 때 쓰려고 페이지가 쥔다
// 모바일은 일정 · 백로그를 탭으로 나누고(내 대시보드와 같음), 백로그는 접지 않는다. 카테고리 완료율 카드는 일정 탭에
export function TeamHomeTab({ teamUuid, categories, progress, members, membership, myUuid, selectedIds, onSelectedIdsChange, onManageCategories, onChanged }) {
  const toast = useToast();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  // 보기(일·주·월)·백로그 범위는 주소(?view=·?backlog=)에 담아 새로고침해도 그대로 둔다. 기본값이면 주소에서 뺀다
  const [searchParams, setSearchParams] = useSearchParams();
  const setParam = (key, value, fallback) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === fallback) next.delete(key);
      else next.set(key, value);
      return next;
    });
  const view = ['week', 'month'].includes(searchParams.get('view')) ? searchParams.get('view') : 'day';
  const setView = (value) => setParam('view', value, 'day');
  const backlogScope = searchParams.get('backlog') === 'mine' ? 'mine' : 'all';
  const setBacklogScope = (value) => setParam('backlog', value, 'all');
  const [baseDate, setBaseDate] = useState(() => startOfDay(new Date()));
  const [board, setBoard] = useState({ schedules: [], backlogs: [] });
  const [backlogCollapsed, setBacklogCollapsed] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [mobileTab, setMobileTab] = useState('todos'); // 모바일 일정 · 백로그 탭
  const { reloadKey, reload: reloadBoard } = useReload();

  const range = useMemo(() => boardRange(view, baseDate), [view, baseDate]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  // 보드를 다시 불러오고 팀 화면(숫자 카드 등)에도 알린다
  const reload = useCallback(() => {
    reloadBoard();
    onChanged();
  }, [reloadBoard, onChanged]);

  useEffect(() => {
    let ignore = false;
    const params = { from: toDateKey(range.from), to: toDateKey(range.to), categoryIds: selectedIds };
    Promise.all([getTeamSchedules(teamUuid, params), getTeamBacklogs(teamUuid, params)])
      .then(([schedules, backlogs]) => !ignore && setBoard({ schedules: [...schedules].sort(byStart), backlogs }))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '팀 할 일을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [teamUuid, range, selectedIds, reloadKey]);

  const move = (direction) => {
    if (view === 'week') setBaseDate(addDays(baseDate, 7 * direction));
    else if (view === 'month') setBaseDate(addMonths(baseDate, direction));
    else setBaseDate(addDays(baseDate, direction));
  };

  const openDay = (date) => {
    setBaseDate(startOfDay(date));
    setView('day');
  };

  const run = async (task, fallback) => {
    try {
      await task();
      reload();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    }
  };

  const actions = {
    onToggle: (todo) =>
      run(async () => {
        const updated = await toggleTodoComplete(todo.id);
        if (updated?.isCompleted) toast('할 일을 완료했어요');
      }, '완료 표시를 바꾸지 못했어요.'),
    onOpen: (todo) => setDrawer({ todoId: todo.id }),
    onToggleSubtask: (id) => run(() => toggleTodoComplete(id), '완료 표시를 바꾸지 못했어요.'),
    onReorderSubtasks: (parentId, ids) => run(() => reorderChildTodos(parentId, ids), '순서를 바꾸지 못했어요.'),
  };

  const toggleCategory = (id) =>
    onSelectedIdsChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);

  const schedules = groupTodos(board.schedules);
  const backlogs = groupTodos(board.backlogs).filter((todo) => backlogScope === 'all' || todo.assigneeUuid === myUuid);
  const showTodos = !isMobile || mobileTab === 'todos';
  const showBacklog = !isMobile || mobileTab === 'backlog';
  const assignees = members.map((member) => ({ value: member.uuid, label: member.uuid === myUuid ? `${member.nickname} (나)` : member.nickname }));

  return (
    <div className="team-home">
      <DashboardToolbar
        title={boardRangeTitle(view, range, baseDate)}
        view={view}
        onViewChange={setView}
        onPrev={() => move(-1)}
        onNext={() => move(1)}
        onToday={() => setBaseDate(startOfDay(new Date()))}
        onAdd={() =>
          categories.length > 0
            ? setDrawer({ defaults: { date: baseDate, categoryId: selectedIds[0] } })
            : showErrorToast('할 일을 넣을 팀 카테고리가 아직 없어요.')
        }
      />
      <CategoryFilter
        categories={categories}
        selectedIds={selectedIds}
        onToggle={toggleCategory}
        onReset={() => onSelectedIdsChange([])}
        onManage={onManageCategories}
      />
      {isMobile && (
        <Tabs
          items={[
            { value: 'todos', label: '일정', count: schedules.length },
            { value: 'backlog', label: '백로그', count: backlogs.length },
          ]}
          value={mobileTab}
          onChange={setMobileTab}
          label="팀 보드 보기"
        />
      )}

      <div className={classNames('board', { 'board--tabbed': isMobile })}>
        {showTodos && view === 'day' && (
          <section className="board-column board-column--wide" aria-label="일정">
            <BoardColumnHeader title="일정" count={schedules.length} />
            <TodoList todos={schedules} categoriesById={categoriesById} actions={actions} empty="이 날의 팀 일정이 없어요" emptyIcon={calendarIcon} />
          </section>
        )}
        {showTodos && view === 'week' && (
          <WeekBoard
            days={Array.from({ length: 7 }, (_, i) => addDays(range.from, i))}
            todos={schedules}
            selectedDate={baseDate}
            onSelectDate={(date) => setBaseDate(startOfDay(date))}
            onOpenDate={openDay}
            actions={actions}
          />
        )}
        {showTodos && view === 'month' && (
          <MonthBoard
            days={range.days}
            month={baseDate}
            todos={schedules}
            selectedDate={baseDate}
            onSelectDate={(date) => setBaseDate(startOfDay(date))}
            onOpenDate={openDay}
          />
        )}

        <div className="team-home__side">
          {showTodos && view === 'day' && categories.length > 0 && (
            <section className="card team-progress" aria-label="카테고리 완료율">
              <div className="section-header">
                <h3 className="section-header__title team-progress__title">카테고리 완료율</h3>
                <span className="board-column__spacer" />
                <span className="section-header__hint">전체 기간</span>
              </div>
              {categories.map((category) => {
                const item = progress.get(category.id);
                return (
                  <div key={category.id} className="team-progress__row">
                    <div className="team-progress__labels">
                      <span className="team-progress__name">{category.name}</span>
                      <span className="team-progress__value num">
                        {item ? `${Math.round(item.rate)}% · ${item.completed} / ${item.total}` : '–'}
                      </span>
                    </div>
                    <ProgressBar value={item?.rate ?? 0} label={`${category.name} 완료율`} />
                  </div>
                );
              })}
            </section>
          )}
          {showBacklog && (
            <BacklogPanel
              todos={backlogs}
              categoriesById={categoriesById}
              actions={actions}
              headerExtra={<SegmentedControl options={BACKLOG_SCOPES} value={backlogScope} onChange={setBacklogScope} label="백로그 범위" />}
              collapsible={!isMobile && view !== 'day'}
              collapsed={backlogCollapsed}
              onCollapsedChange={setBacklogCollapsed}
            />
          )}
        </div>
      </div>

      {drawer && categories.length > 0 && (
        <TodoDrawer
          key={drawer.todoId ?? 'new'}
          todoId={drawer.todoId}
          defaults={drawer.defaults}
          categories={categories}
          assignees={assignees}
          canAssign={hasPermission(membership, 'ASSIGN_TODOS')}
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
