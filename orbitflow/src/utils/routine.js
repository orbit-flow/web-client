import { WEEKDAYS } from './date';

// 반복 주기 선택지. 간격 단위는 unit
export const DURATION_TYPES = [
  { value: 'DAY', label: '매일', unit: '일' },
  { value: 'WEEK', label: '매주', unit: '주' },
  { value: 'MONTH', label: '매월', unit: '개월' },
  { value: 'MONTH_END', label: '매월 말일', unit: '개월' },
  { value: 'YEAR', label: '매년', unit: '년' },
];

// daysOfWeek 비트마스크: 월=1, 화=2, 수=4 … 일=64
export const weekdayBit = (index) => 1 << index;

export function weekdaysFromMask(mask) {
  return WEEKDAYS.filter((_, index) => mask & weekdayBit(index));
}

// "매주 월·수·금", "2주마다 화", "매일", "3개월마다 말일"
export function routineSummary({ durationType, duration, daysOfWeek }) {
  const info = DURATION_TYPES.find((item) => item.value === durationType);
  if (!info) return '';
  const base = duration > 1 ? `${duration}${info.unit}마다` : info.label;
  if (durationType === 'WEEK' && daysOfWeek) {
    return `${duration > 1 ? base : '매주'} ${weekdaysFromMask(daysOfWeek).join('·')}`;
  }
  if (durationType === 'MONTH_END' && duration > 1) return `${base} 말일`;
  return base;
}
