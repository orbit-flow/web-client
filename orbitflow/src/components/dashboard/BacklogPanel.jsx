import { useState } from 'react';
import classNames from 'classnames';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { BoardColumnHeader } from './BoardColumn';
import { TodoList } from './TodoList';
import prevIcon from '../../assets/icons/prev-ghost.svg';
import nextIcon from '../../assets/icons/next-ghost.svg';

// 백로그 칸(폭 380). 주간·월간에서는 collapsible: 접으면 52px 세로 막대(rail). headerExtra: 머리 오른쪽(팀의 전체·내 담당 등)
// 펼칠 때는 막대(52) → 칸(380)으로 늘어나고(.board-column--opening), 접을 때는 칸이 52까지 줄어든 뒤(.board-column--closing) 막대로 바뀐다
export function BacklogPanel({ todos, categoriesById, actions, hint, headerExtra, collapsible = false, collapsed = false, onCollapsedChange }) {
  const [motion, setMotion] = useState(null); // 'opening' | 'closing'

  if (collapsible && collapsed) {
    return (
      <div className="backlog-rail">
        <IconButton
          icon={prevIcon}
          label="백로그 펼치기"
          onClick={() => {
            setMotion('opening');
            onCollapsedChange(false);
          }}
        />
        <span className="backlog-rail__label">백로그</span>
        <Badge>{todos.length}</Badge>
      </div>
    );
  }

  return (
    <section
      className={classNames('board-column board-column--backlog', motion && `board-column--${motion}`)}
      aria-label="백로그"
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (motion === 'closing') onCollapsedChange(true);
        setMotion(null);
      }}
    >
      <BoardColumnHeader title="백로그" count={todos.length} hint={hint}>
        {headerExtra}
        {collapsible && <IconButton icon={nextIcon} label="백로그 접기" disabled={motion === 'closing'} onClick={() => setMotion('closing')} />}
      </BoardColumnHeader>
      <TodoList todos={todos} categoriesById={categoriesById} actions={actions} empty="이 기간의 백로그가 없어요" />
    </section>
  );
}
