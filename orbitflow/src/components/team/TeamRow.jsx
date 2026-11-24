import { TeamIcon } from './TeamIcon';

// 팀 한 줄(받은 초대·공개 팀 찾기·삭제한 팀): 아이콘 40 + 이름·보조 문구 + 오른쪽 버튼(children)
export function TeamRow({ name, icon, subtitle, meta, children }) {
  return (
    <div className="team-row">
      <TeamIcon name={name} icon={icon} size="sm" />
      <div className="team-row__text">
        <span className="team-row__name">{name}</span>
        {subtitle && <span className="team-row__subtitle">{subtitle}</span>}
      </div>
      {meta && <span className="team-row__meta">{meta}</span>}
      {children}
    </div>
  );
}
