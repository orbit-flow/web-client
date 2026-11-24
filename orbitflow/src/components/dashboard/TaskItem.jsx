import { useState } from 'react';
import classNames from 'classnames';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { SubtaskList } from './SubtaskList';
import bellIcon from '../../assets/icons/bell.svg';
import calendarIcon from '../../assets/icons/calendar.svg';
import chevronDownIcon from '../../assets/icons/chevron-down.svg';
import chevronRightIcon from '../../assets/icons/chevron-right.svg';
import earthIcon from '../../assets/icons/earth.svg';
import lockIcon from '../../assets/icons/lock.svg';
import moreIcon from '../../assets/icons/more.svg';
import repeatIcon from '../../assets/icons/repeat.svg';
import usersIcon from '../../assets/icons/users.svg';

// 카테고리 공개 범위 표시. 팀 카테고리는 TEAM(구성원 모두)·ROLE(역할 지정)
const VISIBILITY = {
  PRIVATE: { icon: lockIcon, label: '나만 보기' },
  FOLLOWER: { icon: usersIcon, label: '팔로워 공개' },
  TEAM: { icon: usersIcon, label: '팀 공개' },
  ROLE: { icon: lockIcon, label: '역할 지정' },
  PUBLIC: { icon: earthIcon, label: '전체 공개' },
};

// 할 일 한 줄.
// - type="schedule": 시간표형. 왼쪽에 시작(작게)·끝(굵게) 시각 + 카테고리 색 막대. 지났으면 끝 시각 옆 빨간 점
// - type="backlog": 마감형. 제목 옆 마감 배지(due: { label, tone }) + 아래 기간(period). 지났으면 기간 빨강
// subtasks: [{ id, name, done, overdue?, date? }] — 요약을 누르면 펼친다. preview: 아직 생성 안 된 반복 회차
// assignee: { nickname, profileImage? } — 팀 할 일의 담당자
// 완료 체크(하위 할 일 포함)는 카테고리 색으로 칠한다(--checkbox-color)
export function TaskItem({
  type = 'schedule',
  title,
  done = false,
  preview = false,
  overdue = false,
  startTime,
  endTime,
  period,
  due,
  category,
  visibility,
  repeat = false,
  reminder = false,
  assignee,
  subtasks = [],
  defaultExpanded = false,
  onToggle,
  onMore,
  onToggleSubtask,
  onReorderSubtasks,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const schedule = type === 'schedule';
  const visibilityInfo = VISIBILITY[visibility];
  const doneCount = subtasks.filter((item) => item.done).length;

  // 줄 아무 데나 누르면 그 할 일 창을 연다(체크박스·하위 할 일·버튼처럼 따로 누르는 곳은 제외)
  const openFromRow = (event) => {
    if (!onMore || event.target.closest('button, input, label, a, .subtasks')) return;
    onMore();
  };

  return (
    <div
      className={classNames('task-item', `task-item--${type}`, {
        'task-item--done': done,
        'task-item--overdue': overdue,
        'task-item--preview': preview,
        'task-item--clickable': Boolean(onMore),
      })}
      onClick={openFromRow}
      style={category?.color ? { '--checkbox-color': category.color } : undefined}
    >
      {schedule && (
        <div className="task-item__time num">
          <span className="task-item__start">{startTime}</span>
          <span className="task-item__end">
            {endTime}
            {overdue && <span className="overdue-dot" title="지난 일정" />}
          </span>
        </div>
      )}
      {schedule && <span className="task-item__bar" style={{ backgroundColor: category?.color }} aria-hidden="true" />}

      <Checkbox checked={done} onChange={onToggle} readOnly={!onToggle} aria-label={`${title} 완료`} />

      <div className="task-item__body">
        <div className="task-item__title-row">
          <span className="task-item__title">{title}</span>
          {repeat && (
            <span className="task-item__icon" title="반복 일정">
              <Icon src={repeatIcon} size={14} />
            </span>
          )}
          {due && <Badge tone={due.tone}>{due.label}</Badge>}
        </div>

        <div className="task-item__meta">
          {!schedule && period && (
            <span className={classNames('task-item__meta-item num', { 'task-item__meta-item--danger': overdue })}>
              <Icon src={calendarIcon} size={14} />
              {period}
            </span>
          )}
          {category && (
            <span className="task-item__meta-item">
              <span className="task-item__dot" style={{ backgroundColor: category.color }} aria-hidden="true" />
              {category.name}
            </span>
          )}
          {visibilityInfo && (
            <span className="task-item__meta-item">
              <Icon src={visibilityInfo.icon} size={14} />
              {visibilityInfo.label}
            </span>
          )}
          {assignee && (
            <span className="task-item__meta-item task-item__assignee">
              <AvatarSlot src={assignee.profileImage} size="xs" />
              {assignee.nickname}
            </span>
          )}
          {reminder && (
            <span className="task-item__icon" title="리마인드">
              <Icon src={bellIcon} size={14} />
            </span>
          )}
        </div>

        {subtasks.length > 0 && (
          <button
            type="button"
            className="task-item__subtasks num"
            aria-expanded={expanded}
            onClick={() => setExpanded((prev) => !prev)}
          >
            <Icon src={expanded ? chevronDownIcon : chevronRightIcon} size={14} />
            하위 할 일 {doneCount}/{subtasks.length}
          </button>
        )}
        {expanded && subtasks.length > 0 && (
          <SubtaskList
            items={subtasks}
            onToggle={onToggleSubtask}
            onReorder={onReorderSubtasks}
            guideLine={!schedule}
          />
        )}
      </div>

      {onMore !== null && <IconButton icon={moreIcon} label={`${title} 자세히`} onClick={onMore} />}
    </div>
  );
}
