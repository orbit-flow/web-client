import { useNavigate } from 'react-router-dom';
import { AvatarPreview } from '../avatar/AvatarPreview';
import { Button } from '../ui/Button';
import { LevelBadge } from '../ui/LevelBadge';
import { PointBalance } from '../ui/PointBalance';
import { ProgressBar } from '../ui/ProgressBar';
import calendarCheckIcon from '../../assets/icons/calendar-check.svg';
import shirtIcon from '../../assets/icons/shirt.svg';

// 대시보드 위쪽 내 프로필: 큰 그림은 내 아바타(입은 아이템을 겹친 캐릭터, 프로필 사진 아님) · 레벨 · 포인트 · 출석 체크 · 오늘 진행
// avatarItems: 내 아바타의 equippedItems
export function ProfileCard({ nickname, avatarItems = [], level, point, attended, attending, onAttend, today }) {
  const navigate = useNavigate();

  return (
    <section className="profile-card" aria-label="내 프로필">
      <AvatarPreview items={avatarItems} className="profile-card__avatar" />
      <div className="profile-card__info">
        <div className="profile-card__row">
          <h2 className="profile-card__name">{nickname}</h2>
          <Button variant="secondary" size="md" iconLeft={shirtIcon} onClick={() => navigate('/avatar')}>
            꾸미기
          </Button>
        </div>
        {level && (
          <LevelBadge type="progress" level={level.level} currentExp={level.currentExp} requiredExp={level.requiredExp} />
        )}
        <div className="profile-card__row">
          {point != null && <PointBalance amount={point} />}
          <Button
            size="md"
            iconLeft={calendarCheckIcon}
            onClick={onAttend}
            disabled={attended || attending}
          >
            {attended ? '오늘 출석 완료' : '출석 체크 · 500P'}
          </Button>
        </div>
        <hr className="profile-card__divider" />
        <div className="profile-card__progress">
          <div className="profile-card__progress-labels">
            <span>오늘 진행</span>
            <span className="num">
              {today.done} / {today.total}
            </span>
          </div>
          <ProgressBar value={today.done} max={Math.max(today.total, 1)} label="오늘 진행" />
        </div>
      </div>
    </section>
  );
}
