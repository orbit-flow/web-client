import { useState } from 'react';
import classNames from 'classnames';
import { Checkbox } from '../ui/Checkbox';
import { Icon } from '../ui/Icon';
import { BoardColumnHeader } from './BoardColumn';
import { SubtaskList } from './SubtaskList';
import { categoryColor, isOverdue } from '../../utils/todo';
import { formatTime, isSameDay, parseLocal, toDateKey, weekdayName } from '../../utils/date';
import chevronDownIcon from '../../assets/icons/chevron-down.svg';
import listTodoIcon from '../../assets/icons/list-todo.svg';

// 주간 보기: 월~일 7칸. 일정은 시작일 칸에 넣는다
// 칸(할 일 카드 밖)을 한 번 누르면 그날을 고르고(onSelectDate), 두 번 누르면 그날 일간 보기(onOpenDate)
export function WeekBoard({ days, todos, selectedDate, onSelectDate, onOpenDate, actions }) {
  const byDay = new Map(days.map((day) => [toDateKey(day), []]));
  for (const todo of todos) {
    byDay.get(toDateKey(parseLocal(todo.startDate)))?.push(todo);
  }

  return (
    <section className="board-column board-column--wide" aria-label="일정">
      <BoardColumnHeader title="일정" count={todos.length} hint="월 – 일 · 두 번 누르면 일간" />
      <div className="week-board">
        {days.map((day) => (
          <div
            key={toDateKey(day)}
            className={classNames('week-board__day', { 'week-board__day--selected': isSameDay(day, selectedDate) })}
            onClick={(event) => !event.target.closest('.week-card') && onSelectDate(day)}
            onDoubleClick={(event) => !event.target.closest('.week-card') && onOpenDate(day)}
          >
            <button type="button" className="week-board__head" aria-pressed={isSameDay(day, selectedDate)}>
              <span className="week-board__weekday">{weekdayName(day)}</span>
              <span className="week-board__date num">{day.getDate()}</span>
            </button>
            {byDay.get(toDateKey(day)).map((todo) => (
              <WeekCard key={todo.id ?? `${todo.routineId}-${todo.startDate}`} todo={todo} actions={actions} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

// 주간 카드: 왼쪽 체크 상자, 오른쪽 글자 칸에 1) 할 일 이름 2) 시간 · 카테고리
// 완료 체크(하위 일정 포함)는 카테고리 색. 하위 일정이 있으면 카드 아래에 탭이 붙는다(왼쪽 아이콘 + 하위 n/m, 오른쪽 꺾쇠). 누르면 탭 아래로 체크 상자 + 이름 목록이 펼쳐진다
function WeekCard({ todo, actions }) {
  const [expanded, setExpanded] = useState(false);
  const children = todo.children ?? [];
  return (
    <div
      className={classNames('week-card', { 'week-card--done': todo.isCompleted })}
      style={{ '--checkbox-color': categoryColor(todo.categoryColor) }}
    >
      <div className="week-card__main">
        <Checkbox
          checked={todo.isCompleted}
          onChange={actions.onToggle ? () => actions.onToggle(todo) : undefined}
          readOnly={!actions.onToggle}
          aria-label={`${todo.name} 완료`}
        />
        {actions.onOpen ? (
          <button type="button" className="week-card__title" onClick={() => actions.onOpen(todo)}>
            {todo.name}
          </button>
        ) : (
          <span className="week-card__title">{todo.name}</span>
        )}
        <span className="week-card__meta">
          <span className="week-card__time num">{formatTime(parseLocal(todo.startDate))}</span>
          {isOverdue(todo) && <span className="overdue-dot" title="지난 일정" />}
          <span className="week-card__color" style={{ backgroundColor: categoryColor(todo.categoryColor) }} aria-hidden="true" />
          <span className="week-card__category">{todo.categoryName}</span>
        </span>
      </div>
      {children.length > 0 && (
        <div className="week-card__sub">
          <button
            type="button"
            className="week-card__tab num"
            aria-expanded={expanded}
            onClick={() => setExpanded((prev) => !prev)}
          >
            <Icon src={listTodoIcon} size={14} />
            <span className="week-card__tab-label">
              하위 {children.filter((child) => child.isCompleted).length}/{children.length}
            </span>
            <Icon src={chevronDownIcon} size={14} className={classNames('week-card__chevron', { 'week-card__chevron--open': expanded })} />
          </button>
          {expanded && (
            <SubtaskList
              items={children.map((child) => ({ id: child.id, name: child.name, done: child.isCompleted }))}
              onToggle={actions.onToggleSubtask}
            />
          )}
        </div>
      )}
    </div>
  );
}
