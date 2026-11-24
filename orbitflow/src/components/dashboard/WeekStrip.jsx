import classNames from 'classnames';
import { addDays, isSameDay, startOfWeek, toDateKey, WEEKDAYS } from '../../utils/date';

// 모바일 대시보드 일간의 한 주 날짜 줄(미니 달력 대신, 카테고리 줄 아래). 선택 = 기준일(파란 칸), 점 = 그날 할 일이 있음(eventDays: dateKey Set)
// 날짜 이동·오늘은 위 도구줄이 맡는다
export function WeekStrip({ selected, eventDays, onSelect }) {
  const monday = startOfWeek(selected);
  const days = WEEKDAYS.map((_, index) => addDays(monday, index));
  const today = new Date();

  return (
    <section className="week-strip" aria-label="이번 주">
      <div className="week-strip__days">
        {days.map((day, index) => {
          const hasEvents = eventDays.has(toDateKey(day));
          return (
            <button
              key={toDateKey(day)}
              type="button"
              className={classNames('week-strip__day', {
                'week-strip__day--selected': isSameDay(day, selected),
                'week-strip__day--today': isSameDay(day, today),
              })}
              aria-pressed={isSameDay(day, selected)}
              aria-label={`${day.getMonth() + 1}월 ${day.getDate()}일 ${WEEKDAYS[index]}요일${hasEvents ? ', 할 일 있음' : ''}`}
              onClick={() => onSelect(day)}
            >
              <span>{WEEKDAYS[index]}</span>
              <span className="week-strip__date num">{day.getDate()}</span>
              <span className={classNames('week-strip__dot', { 'week-strip__dot--on': hasEvents })} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
