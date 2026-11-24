import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { SegmentedControl } from '../ui/SegmentedControl';
import prevIcon from '../../assets/icons/prev-ghost.svg';
import nextIcon from '../../assets/icons/next-ghost.svg';
import plusIcon from '../../assets/icons/plus.svg';

const VIEW_OPTIONS = [
  { value: 'day', label: '일간' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
];

// 기간 이동 + 일·주·월 전환 + 할 일 추가(onAdd가 없으면 버튼 없음: 다른 사람 대시보드)
export function DashboardToolbar({ title, view, onViewChange, onPrev, onNext, onToday, onAdd }) {
  return (
    <div className="dashboard-toolbar">
      <div className="dashboard-toolbar__range">
        <IconButton icon={prevIcon} label="이전" onClick={onPrev} />
        <h2 className="dashboard-toolbar__title num">{title}</h2>
        <IconButton icon={nextIcon} label="다음" onClick={onNext} />
        <Button variant="neutral" size="md" className="today-button" onClick={onToday}>
          오늘
        </Button>
      </div>
      <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={onViewChange} label="보기" />
      {onAdd && (
        <div className="dashboard-toolbar__end">
          <Button dense iconLeft={plusIcon} onClick={onAdd}>
            할 일
          </Button>
        </div>
      )}
    </div>
  );
}
