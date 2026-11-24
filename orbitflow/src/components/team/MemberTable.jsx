import { AvatarSlot } from '../ui/AvatarSlot';
import { Badge } from '../ui/Badge';
import { GlyphButton } from '../ui/GlyphButton';
import { Menu } from '../ui/Menu';
import { RoleTag } from './RoleTag';
import { formatMonthDay, parseLocal } from '../../utils/date';
import messageIcon from '../../assets/icons/message.svg';

const joinedLabel = (joinedAt) => {
  const date = parseLocal(joinedAt);
  return `${date.getFullYear()}.${formatMonthDay(date)} 가입`;
};

// 구성원 표: 사진·이름(소유자·나 배지)·이메일 · 대표 역할(+나머지 수) · 가입일 · 1:1 대화 · 더보기
// onChat이 있으면 나를 뺀 줄에 대화 버튼, menuItems(member)가 있으면 더보기 메뉴
export function MemberTable({ members, myUuid, onChat, menuItems }) {
  return (
    <div className="data-table team-members">
      <div className="data-table__head">
        <span className="data-table__grow">구성원</span>
        <span className="team-members__role">역할</span>
        <span className="team-members__joined">가입일</span>
        <span className="team-members__actions" />
      </div>
      {members.map((member) => {
        const me = member.uuid === myUuid;
        return (
          <div key={member.uuid} className="data-table__row team-members__row">
            <div className="data-table__grow team-members__person">
              <AvatarSlot src={member.profileImage} size="sm" />
              <div className="team-members__text">
                <span className="team-members__name-row">
                  {/* 팀 안에서는 팀 프로필만 보여 주고 개인 프로필 화면으로 보내지 않는다 */}
                  <span className="team-members__name">{member.nickname}</span>
                  {member.owner && <Badge tone="accent">소유자</Badge>}
                  {me && <Badge>나</Badge>}
                </span>
                {member.email && <span className="team-members__email">{member.email}</span>}
              </div>
            </div>
            <span className="team-members__role">
              <RoleTag
                owner={member.owner && !member.topRoleName}
                name={member.topRoleName}
                color={member.topRoleColor}
                extra={member.roleCount - 1}
              />
            </span>
            <span className="team-members__joined num">{joinedLabel(member.joinedAt)}</span>
            <span className="team-members__actions">
              {onChat && !me && <GlyphButton icon={messageIcon} label={`${member.nickname}님과 1:1 대화`} onClick={() => onChat(member)} />}
              {/* 내 줄은 대화 버튼이 없어도 같은 자리를 비워 줄 높이를 맞춘다 */}
              {onChat && me && <span className="team-members__action-space" aria-hidden="true" />}
              {menuItems && <Menu label={`${member.nickname}님 메뉴`} items={menuItems(member)} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}
