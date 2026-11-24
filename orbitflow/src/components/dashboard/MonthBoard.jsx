import classNames from 'classnames';
import { BoardColumnHeader } from './BoardColumn';
import { categoryColor, isOverdue } from '../../utils/todo';
import { formatShortDate, formatTime, isSameDay, parseLocal, startOfDay, toDateKey, WEEKDAYS } from '../../utils/date';

const MAX_EVENTS = 3;

// 월간 보기: 달력 칸마다 일정 최대 3줄 + "+n개". 일정 줄은 카테고리 색(왼쪽 막대 + 옅은 바탕, 모바일은 색 점). 칸을 한 번 누르면 그날을 고르고(onSelectDate), 두 번 누르면 그날 일간 보기(onOpenDate)
export function MonthBoard({ days, month, todos, selectedDate, onSelectDate, onOpenDate }) {
  const byDay = new Map(days.map((day) => [toDateKey(day), []]));
  for (const todo of todos) {
    byDay.get(toDateKey(parseLocal(todo.startDate)))?.push(todo);
  }
  const today = startOfDay(new Date());
  const range = `${formatShortDate(days[0])} – ${formatShortDate(days[days.length - 1])}`;

  return (
    <section className="board-column board-column--wide" aria-label="일정">
      <BoardColumnHeader title="일정" count={todos.length} hint={`${range} · 두 번 누르면 일간`} />
      <div className="month-board" role="grid">
        <div className="month-board__weekdays" role="row">
          {WEEKDAYS.map((name) => (
            <span key={name} role="columnheader">
              {name}
            </span>
          ))}
        </div>
        <div className="month-board__cells">
          {days.map((day) => {
            const events = byDay.get(toDateKey(day));
            const selected = isSameDay(day, selectedDate);
            return (
              <button
                key={toDateKey(day)}
                type="button"
                role="gridcell"
                aria-selected={selected}
                className={classNames('month-board__cell', {
                  'month-board__cell--past': day < today,
                  'month-board__cell--outside': day.getMonth() !== month.getMonth(),
                  'month-board__cell--selected': selected,
                })}
                onClick={() => onSelectDate(day)}
                onDoubleClick={() => onOpenDate(day)}
              >
                <span className="month-board__date num">{day.getDate()}</span>
                {events.slice(0, MAX_EVENTS).map((todo) => (
                  <span
                    key={todo.id ?? `${todo.routineId}-${todo.startDate}`}
                    className={classNames('month-event', {
                      'month-event--done': todo.isCompleted,
                      'month-event--overdue': isOverdue(todo),
                    })}
                    style={{ '--event-color': categoryColor(todo.categoryColor) }}
                  >
                    {isOverdue(todo) && <span className="overdue-dot" aria-hidden="true" />}
                    <span className="month-event__label">
                      {formatTime(parseLocal(todo.startDate))} {todo.name}
                    </span>
                  </span>
                ))}
                {events.length > MAX_EVENTS && <span className="month-board__more">+{events.length - MAX_EVENTS}개</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
