import { ProgressBar } from './ProgressBar';

// type
// - text: 이름 등 다른 정보와 같은 계층(사이드바 프로필)
// - chip: 강조용 레벨 칩
// - progress: 칩 + 칭호 + 경험치 + 진행 막대. 최대 레벨이면 currentExp·requiredExp가 없다
export function LevelBadge({ level, type = 'chip', title, currentExp, requiredExp }) {
  const label = `Lv.${level}`;

  if (type === 'text') {
    return <span className="level-text">{label}</span>;
  }

  const chip = <span className="level-chip num">{label}</span>;
  if (type === 'chip') {
    return chip;
  }

  const hasExp = currentExp != null && requiredExp != null;
  return (
    <div className="level-progress">
      <div className="level-progress__header">
        {chip}
        <span className="level-progress__title">{title}</span>
        <span className="level-progress__exp num">
          {hasExp ? `${currentExp.toLocaleString()} / ${requiredExp.toLocaleString()} XP` : '최대 레벨'}
        </span>
      </div>
      <ProgressBar value={hasExp ? currentExp : 1} max={hasExp ? requiredExp : 1} label="레벨 경험치" tone="level" />
    </div>
  );
}
