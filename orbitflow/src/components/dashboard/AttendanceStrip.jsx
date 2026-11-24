import classNames from 'classnames';
import { Icon } from '../ui/Icon';
import checkCircleIcon from '../../assets/icons/check-circle.svg';
import coinsIcon from '../../assets/icons/coins.svg';

// 주간 출석 7칸. days: [{ label: '월', state: 'checked' | 'today' | 'upcoming' }]
// 보상은 출석 1회당 500P(+경험치 10), 연속 출석 보너스 없음. onCheck가 있으면 오늘 칸을 눌러 출석
export function AttendanceStrip({ days, reward = '500P', onCheck }) {
  return (
    <ol className="attendance">
      {days.map((day) => {
        const isToday = day.state === 'today';
        const content = (
          <>
            <span className="attendance__day">{day.label}</span>
            <Icon src={day.state === 'checked' ? checkCircleIcon : coinsIcon} size={20} />
            <span className="attendance__reward num">{reward}</span>
          </>
        );
        return (
          <li key={day.label} className={classNames('attendance__cell', `attendance__cell--${day.state}`)}>
            {isToday && onCheck ? (
              <button type="button" className="attendance__check" onClick={onCheck} aria-label={`오늘(${day.label}) 출석하기`}>
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
