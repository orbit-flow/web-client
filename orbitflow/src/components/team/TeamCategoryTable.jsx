import { Icon } from '../ui/Icon';
import { Menu } from '../ui/Menu';
import { ProgressBar } from '../ui/ProgressBar';
import { categoryColor } from '../../utils/todo';
import { TEAM_VISIBILITY } from '../../utils/team';
import earthIcon from '../../assets/icons/earth.svg';
import lockIcon from '../../assets/icons/lock.svg';
import usersIcon from '../../assets/icons/users.svg';

const VISIBILITY_ICONS = { PUBLIC: earthIcon, FOLLOWER: usersIcon, PRIVATE: lockIcon };

// 팀 카테고리 표: 이름 · 공개 범위 · 완료율 막대 · 완료/전체. 줄을 누르면 onOpen, 관리 권한이 있으면 더보기
// progress: Map(categoryId → { total, completed, rate })
export function TeamCategoryTable({ categories, progress, onOpen, menuItems }) {
  return (
    <div className="data-table team-categories">
      <div className="data-table__head">
        <span className="data-table__grow">카테고리</span>
        <span className="team-categories__visibility">공개 범위</span>
        <span className="team-categories__progress">완료율</span>
        <span className="team-categories__count">완료 / 전체</span>
        {menuItems && <span className="team-categories__menu" />}
      </div>
      {categories.map((category) => {
        const item = progress.get(category.id);
        return (
          <div key={category.id} className="data-table__row team-categories__row">
            <button type="button" className="data-table__grow team-categories__name" onClick={() => onOpen(category)}>
              <span className="team-categories__color" style={{ backgroundColor: categoryColor(category.color) }} aria-hidden="true" />
              {category.name}
            </button>
            <span className="team-categories__visibility">
              <Icon src={VISIBILITY_ICONS[category.visibility]} size={14} />
              {TEAM_VISIBILITY[category.visibility]?.label}
            </span>
            <span className="team-categories__progress">
              <ProgressBar value={item?.rate ?? 0} label={`${category.name} 완료율`} />
            </span>
            <span className="team-categories__count num">
              <strong>{item ? `${Math.round(item.rate)}%` : '–'}</strong>
              {item && (
                <span>
                  {item.completed} / {item.total}
                </span>
              )}
            </span>
            {menuItems && (
              <span className="team-categories__menu">
                <Menu label={`${category.name} 메뉴`} items={menuItems(category)} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
