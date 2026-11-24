import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyAvatar } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import { getMe } from '../api/user';
import { AvatarSlot } from '../components/ui/AvatarSlot';
import { Icon } from '../components/ui/Icon';
import { LevelBadge } from '../components/ui/LevelBadge';
import { formatPoint } from '../utils/avatar';
import { showErrorToast } from '../utils/errorToast';
import chevronIcon from '../assets/icons/chevron-right.svg';

const DECORATE = [
  { to: '/avatar', label: '아바타' },
  { to: '/shop', label: '상점' },
  { to: '/points', label: '포인트', point: true },
  { to: '/todos', label: '할 일 · 카테고리' },
];

// 설정 화면의 구역(?section=)으로 바로 간다
const SETTINGS = [
  { section: 'profile', label: '프로필' },
  { section: 'account', label: '계정 · 보안' },
  { section: 'privacy', label: '공개 · 대화' },
  { section: 'follow-alerts', label: '팔로우 알림' },
  { section: 'blocks', label: '차단 목록' },
];

function MenuRow({ to, label, value }) {
  return (
    <Link to={to} className="me-menu__row">
      <span className="me-menu__label">{label}</span>
      {value != null && <span className="me-menu__value num">{value}</span>}
      <Icon src={chevronIcon} size={20} className="me-menu__chevron" />
    </Link>
  );
}

// 모바일 하단 탭 "나": 내 프로필 · 꾸미기(아바타·상점·포인트) · 할 일 · 설정으로 들어가는 곳
export function MePage() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([getMe(), getMyAvatar()])
      .then(([me, avatar]) => {
        if (!ignore) {
          setProfile({ nickname: me.nickname, profileImage: me.profileImage, level: avatar.level.level, point: avatar.point ?? 0 });
        }
      })
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '내 정보를 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="page me-page">
      <header className="page__header">
        <h1 className="page__title">나</h1>
      </header>

      {profile ? (
        // 내 프로필 주소(/users/내uuid)는 홈(내 대시보드)으로 넘어가므로 바로 홈으로 보낸다(사이드바 "내 대시보드 보기"와 같은 이름)
        <Link to="/home" className="me-profile">
          <AvatarSlot src={profile.profileImage} alt="" size="lg" />
          <span className="me-profile__identity">
            <span className="me-profile__name">{profile.nickname}</span>
            <LevelBadge type="text" level={profile.level} />
          </span>
          <span className="me-profile__link">내 대시보드 보기</span>
          <Icon src={chevronIcon} size={20} className="me-menu__chevron" />
        </Link>
      ) : (
        <p className="page__empty">불러오는 중이에요</p>
      )}

      <nav className="me-menu" aria-label="꾸미기 · 할 일">
        {DECORATE.map((item) => (
          <MenuRow key={item.to} to={item.to} label={item.label} value={item.point && profile ? formatPoint(profile.point) : null} />
        ))}
      </nav>

      <section className="me-section" aria-labelledby="me-settings">
        <h2 id="me-settings" className="me-section__title">
          설정
        </h2>
        <nav className="me-menu" aria-label="설정">
          {SETTINGS.map((item) => (
            <MenuRow key={item.section} to={`/settings?section=${item.section}`} label={item.label} />
          ))}
        </nav>
      </section>
    </div>
  );
}
