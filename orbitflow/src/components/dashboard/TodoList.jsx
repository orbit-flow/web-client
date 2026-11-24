import { EmptyHint } from '../ui/Icon';
import { TaskItem } from './TaskItem';
import { toTaskItemProps } from '../../utils/todo';
import listTodoIcon from '../../assets/icons/list-todo.svg';

// 묶인 할 일(groupTodos 결과)을 TaskItem 목록으로. actions: { onToggle, onOpen, onToggleSubtask, onReorderSubtasks }
// 비면 empty 문구를 emptyIcon(기본: 할 일 아이콘)과 함께
export function TodoList({ todos, categoriesById, actions, empty, emptyIcon = listTodoIcon }) {
  if (todos.length === 0) {
    return <EmptyHint icon={emptyIcon} title={empty} />;
  }

  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <TaskItem
          key={todo.id ?? `${todo.routineId}-${todo.startDate}`}
          {...toTaskItemProps(todo, categoriesById)}
          onToggle={actions.onToggle && (() => actions.onToggle(todo))}
          onMore={actions.onOpen ? () => actions.onOpen(todo) : null}
          onToggleSubtask={actions.onToggleSubtask}
          onReorderSubtasks={actions.onReorderSubtasks && ((ids) => actions.onReorderSubtasks(todo.id, ids))}
        />
      ))}
    </div>
  );
}
