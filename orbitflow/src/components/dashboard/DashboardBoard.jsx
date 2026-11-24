import classNames from 'classnames';
import { addDays } from '../../utils/date';
import { BacklogPanel } from './BacklogPanel';
import { BoardColumnHeader } from './BoardColumn';
import { MonthBoard } from './MonthBoard';
import { TodoList } from './TodoList';
import { WeekBoard } from './WeekBoard';
import calendarIcon from '../../assets/icons/calendar.svg';

// 보기 전용 actions: 체크 · 열기 · 순서 바꾸기 없이 보여 주기만(TodoList · WeekBoard · BacklogPanel)
const READ_ONLY = {};

// 대시보드 보드(내 대시보드 · 프로필 대시보드 공통): 일정(일간 목록 · 주간 · 월간) + 백로그 칸
// schedules · backlogs는 groupTodos로 묶은 것. actions를 넘기지 않으면 보기 전용
// showTodos · showBacklog: 모바일처럼 일정과 백로그를 탭으로 나눌 때 한쪽만. backlogCollapsible: 백로그를 접힌 막대로 둘지(화면마다 기준이 달라 밖에서)
// 백로그 접힘은 탭을 오가도 유지되도록 화면이 들고 넘긴다
// tabbed: 일정 · 백로그를 탭으로 나눠 보여 줄 때(모바일). 탭에 이름 · 개수가 있으므로 칸 머리의 제목 · 개수는 숨긴다(dashboard.css)
export function DashboardBoard({
  tabbed = false,
  view,
  range,
  baseDate,
  schedules,
  backlogs,
  categoriesById,
  actions = READ_ONLY,
  showTodos = true,
  showBacklog = true,
  backlogCollapsible,
  backlogCollapsed,
  onBacklogCollapsedChange,
  onSelectDate,
  onOpenDate,
}) {
  return (
    <div className={classNames('board', { 'board--tabbed': tabbed })}>
      {showTodos && view === 'day' && (
        <section className="board-column board-column--wide" aria-label="일정">
          <BoardColumnHeader title="일정" count={schedules.length} />
          <TodoList todos={schedules} categoriesById={categoriesById} actions={actions} empty="이 날의 일정이 없어요" emptyIcon={calendarIcon} />
        </section>
      )}
      {showTodos && view === 'week' && (
        <WeekBoard
          days={Array.from({ length: 7 }, (_, i) => addDays(range.from, i))}
          todos={schedules}
          selectedDate={baseDate}
          onSelectDate={onSelectDate}
          onOpenDate={onOpenDate}
          actions={actions}
        />
      )}
      {showTodos && view === 'month' && (
        <MonthBoard
          days={range.days}
          month={baseDate}
          todos={schedules}
          selectedDate={baseDate}
          onSelectDate={onSelectDate}
          onOpenDate={onOpenDate}
        />
      )}
      {showBacklog && (
        <BacklogPanel
          todos={backlogs}
          categoriesById={categoriesById}
          actions={actions}
          hint={view === 'day' ? '이 날과 기간이 겹치는 것' : '이 기간과 겹치는 것'}
          collapsible={backlogCollapsible}
          collapsed={backlogCollapsed}
          onCollapsedChange={onBacklogCollapsedChange}
        />
      )}
    </div>
  );
}
