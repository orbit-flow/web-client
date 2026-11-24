import { Icon } from '../ui/Icon';
import { RoleTag } from './RoleTag';
import { TeamIcon } from './TeamIcon';
import earthIcon from '../../assets/icons/earth.svg';
import lockIcon from '../../assets/icons/lock.svg';

// 팀 메인 머리: 아이콘 64 + 이름·내 역할 + "비공개 팀 · 구성원 n · 소유자 ○○" + 소개 + 오른쪽 버튼(children)
export function TeamHeader({ team, children }) {
  return (
    <header className="team-header">
      <TeamIcon name={team.name} icon={team.icon} size="lg" />
      <div className="team-header__info">
        <div className="team-header__name-row">
          <h1 className="team-header__name">{team.name}</h1>
          {team.member && <RoleTag owner={team.owner} name={team.myRoleName} color={team.myRoleColor} />}
        </div>
        <p className="team-header__meta">
          <Icon src={team.isPrivate ? lockIcon : earthIcon} size={14} />
          {team.isPrivate ? '비공개 팀' : '공개 팀'} · 구성원 {team.memberCount} · 소유자 {team.ownerNickname}
        </p>
        {team.description && <p className="team-header__desc">{team.description}</p>}
      </div>
      {children}
    </header>
  );
}
