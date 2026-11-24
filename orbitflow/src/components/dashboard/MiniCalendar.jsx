import classNames from 'classnames';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { formatYearMonth, isSameDay, monthGrid, toDateKey, WEEKDAYS } from '../../utils/date';
import prevIcon from '../../assets/icons/prev-ghost.svg';
import nextIcon from '../../assets/icons/next-ghost.svg';

// 대시보드 미니 달력. 선택 = 기준일(파란 칸), 오늘 = 테두리, 점 = 그날 할 일이 있음(eventDays: dateKey Set)
export function MiniCalendar({ month, selected, eventDays, onMonthChange, onSelect, onToday }) {
  const days = monthGrid(month);
  const today = new Date();
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <section className="mini-calendar" aria-label="달력">
      <div className="mini-calendar__header">
        <h2 className="mini-calendar__month">{formatYearMonth(month)}</h2>
        <IconButton icon={prevIcon} label="이전 달" onClick={() => onMonthChange(-1)} />
        <IconButton icon={nextIcon} label="다음 달" onClick={() => onMonthChange(1)} />
        <Button variant="neutral" dense className="today-button" onClick={onToday}>
          오늘
        </Button>
      </div>
      <div className="mini-calendar__grid" role="grid">
        <div className="mini-calendar__week" role="row">
          {WEEKDAYS.map((name) => (
            <span key={name} className="mini-calendar__weekday" role="columnheader">
              {name}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={toDateKey(week[0])} className="mini-calendar__week" role="row">
            {week.map((day) => {
              const outside = day.getMonth() !== month.getMonth();
              const isSelected = isSameDay(day, selected);
              return (
                <button
                  key={toDateKey(day)}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${day.getMonth() + 1}월 ${day.getDate()}일`}
                  className={classNames('mini-calendar__day num', {
                    'mini-calendar__day--outside': outside,
                    'mini-calendar__day--selected': isSelected,
                    'mini-calendar__day--today': isSameDay(day, today),
                  })}
                  onClick={() => onSelect(day)}
                >
                  {day.getDate()}
                  {eventDays.has(toDateKey(day)) && <span className="mini-calendar__dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
