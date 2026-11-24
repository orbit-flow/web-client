import classNames from 'classnames';

// 팀 메인 숫자 카드. danger면 숫자를 빨갛게(마감 지남이 1 이상)
export function TeamStatCard({ label, value, danger = false }) {
  return (
    <div className="team-stat">
      <span className="team-stat__label">{label}</span>
      <span className={classNames('team-stat__value num', { 'team-stat__value--danger': danger })}>{value ?? 0}</span>
    </div>
  );
}
