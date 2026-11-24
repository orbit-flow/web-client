import { Tag } from '../ui/Tag';
import { roleColor } from '../../utils/team';

// 역할 표시 칩(높이 48, 색 점 + 이름). 소유자는 역할이 없어 owner로 따로 표시한다. size md(28)는 상단바 등 좁은 곳
export function RoleTag({ name, color, owner = false, extra = 0, size = 'lg' }) {
  if (!owner && !name) return <span className="role-tag__none">역할 없음</span>;
  return (
    <span className="role-tag">
      <Tag size={size} color={owner ? 'var(--success-500)' : roleColor(color)} className="tag--caption">
        {owner ? '소유자' : name}
      </Tag>
      {extra > 0 && <span className="role-tag__extra num">+{extra}</span>}
    </span>
  );
}
