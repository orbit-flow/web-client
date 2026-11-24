import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { Icon } from '../ui/Icon';
import { RoleTag } from './RoleTag';
import { TeamIcon } from './TeamIcon';
import earthIcon from '../../assets/icons/earth.svg';
import lockIcon from '../../assets/icons/lock.svg';

// 내 팀 카드(TeamResponse): 아이콘·이름·공개 여부·내 역할 + 내 할 일·마감 지남·이번 주 배정
export function TeamCard({ team }) {
  const stats = [
    { label: '내 할 일', value: team.myRemainingTodos },
    { label: '마감 지남', value: team.overdueCount, danger: team.overdueCount > 0 },
    { label: '이번 주 배정', value: team.assignedThisWeek },
  ];

  return (
    <Link to={`/teams/${team.uuid}`} className="team-card">
      <div className="team-card__head">
        <TeamIcon name={team.name} icon={team.icon} />
        <div className="team-card__text">
          <span className="team-card__name">{team.name}</span>
          <span className="team-card__meta">
            <Icon src={team.isPrivate ? lockIcon : earthIcon} size={12} />
            {team.isPrivate ? '비공개' : '공개'} · 구성원 {team.memberCount}
          </span>
        </div>
        <RoleTag owner={team.owner} name={team.myRoleName} color={team.myRoleColor} />
      </div>
      <dl className="team-card__stats">
        {stats.map((stat) => (
          <div key={stat.label} className="team-card__stat">
            <dt>{stat.label}</dt>
            <dd className={classNames('num', { 'team-card__stat--danger': stat.danger })}>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}
