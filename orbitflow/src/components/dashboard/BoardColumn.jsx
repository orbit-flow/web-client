import { Badge } from '../ui/Badge';

// 보드 칸 머리: 제목 + 개수 + 오른쪽 안내 문구(또는 버튼)
export function BoardColumnHeader({ title, count, hint, children }) {
  return (
    <div className="board-column__header">
      <h3 className="board-column__title">{title}</h3>
      <Badge>{count}</Badge>
      <span className="board-column__spacer" />
      {hint && <span className="board-column__hint">{hint}</span>}
      {children}
    </div>
  );
}
