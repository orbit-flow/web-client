import classNames from 'classnames';
import { isImageIcon, teamInitial } from '../../utils/team';

// 팀 아이콘(TeamResponse.icon). 이미지 주소가 아니면 팀 이름 첫 글자. size: sm 40 · md 48 · lg 64 · xl 96
export function TeamIcon({ name, icon, size = 'md' }) {
  return (
    <span className={classNames('team-icon', `team-icon--${size}`)} aria-hidden="true">
      {isImageIcon(icon) ? <img className="team-icon__image" src={icon} alt="" /> : teamInitial(name)}
    </span>
  );
}
