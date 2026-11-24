import { useEffect, useMemo, useState } from 'react';
import { addDays, addMonths, monthGrid, parseLocal, startOfDay, toDateKey } from '../utils/date';
import { boardRange } from '../utils/todo';

// 대시보드 보드의 날짜 상태(내 대시보드 · 프로필 대시보드 공통)
// view(일·주·월)는 화면마다 두는 곳이 달라(주소 ?view= · 화면 안 state) 밖에서 받는다
// loadRange(range)는 그 기간의 { schedules, backlogs }를 돌려주는 함수 — 미니 달력 점(그 달 칸에 걸친 할 일이 있는 날)을 계산할 때 쓴다
// 바뀌면 다시 불러오므로 화면에서 useCallback 등으로 고정해 넘긴다. reloadKey가 바뀌어도 다시 불러온다
export function useBoardCalendar({ view, setView, loadRange, reloadKey }) {
  const [baseDate, setBaseDate] = useState(() => startOfDay(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => addMonths(new Date(), 0));
  const [eventDays, setEventDays] = useState(() => new Set());
  const range = useMemo(() => boardRange(view, baseDate), [view, baseDate]);

  useEffect(() => {
    let ignore = false;
    const days = monthGrid(calendarMonth);
    loadRange({ from: days[0], to: days[days.length - 1] })
      .then(({ schedules, backlogs }) => {
        if (ignore) return;
        const keys = new Set();
        for (const item of [...schedules, ...backlogs]) {
          for (let d = startOfDay(parseLocal(item.startDate)); d <= parseLocal(item.endDate); d = addDays(d, 1)) {
            keys.add(toDateKey(d));
          }
        }
        setEventDays(keys);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [calendarMonth, loadRange, reloadKey]);

  // 그날로 옮기고 미니 달력도 그 달로
  const goTo = (date) => {
    setBaseDate(startOfDay(date));
    setCalendarMonth(addMonths(date, 0));
  };

  // 이전 · 다음: 보기 단위(일 · 주 · 월)만큼
  const move = (direction) => {
    if (view === 'week') goTo(addDays(baseDate, 7 * direction));
    else if (view === 'month') goTo(addMonths(baseDate, direction));
    else goTo(addDays(baseDate, direction));
  };

  const openDay = (date) => {
    goTo(date);
    setView('day');
  };

  return { baseDate, calendarMonth, setCalendarMonth, range, eventDays, goTo, move, openDay };
}
