import { useCallback, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { getPendingOAuthProvider } from '../api/auth';
import { getAccessToken } from '../api/token';
import { SocialLoginProgress } from '../components/auth/SocialLoginProgress';
import { AttendanceStrip } from '../components/dashboard/AttendanceStrip';
import { TaskItem } from '../components/dashboard/TaskItem';
import { FeatureCard } from '../components/landing/FeatureCard';
import { AvatarSlot } from '../components/ui/AvatarSlot';
import { Button } from '../components/ui/Button';
import { LevelBadge } from '../components/ui/LevelBadge';
import { PointBalance } from '../components/ui/PointBalance';
import listTodoIcon from '../assets/icons/list-todo.svg';
import teamIcon from '../assets/icons/team.svg';
import usersIcon from '../assets/icons/users.svg';

// 화면 소개용 예시 데이터(실제 API 아님)
const PREVIEW_WEEK = [
  { label: '월', state: 'checked' },
  { label: '화', state: 'checked' },
  { label: '수', state: 'today' },
  { label: '목', state: 'upcoming' },
  { label: '금', state: 'upcoming' },
  { label: '토', state: 'upcoming' },
  { label: '일', state: 'upcoming' },
];
const PREVIEW_SUBTASKS = [
  { id: 1, name: '자료 조사', done: true },
  { id: 2, name: '목차 정리', done: false },
  { id: 3, name: '초안 쓰기', done: false },
];
const BLUE = 'var(--blue-500)';

export function LandingPage() {
  // 소셜 로그인 성공 시 서버가 이 화면(/)으로 돌려보낸다. 시작한 제공자가 적혀 있으면 로그인부터 마무리
  const [pendingProvider, setPendingProvider] = useState(getPendingOAuthProvider);
  const handleSocialLoginDone = useCallback(() => setPendingProvider(null), []);

  if (pendingProvider) {
    return <SocialLoginProgress provider={pendingProvider} onDone={handleSocialLoginDone} />;
  }
  if (getAccessToken()) {
    return <Navigate to="/home" replace />;
  }
  return <Landing />;
}

function Landing() {
  const navigate = useNavigate();
  const start = () => navigate('/signup');

  return (
    <div className="landing">
      <header className="landing-header">
        <span className="landing-header__logo">Orbitflow</span>
        {/* 상단은 한 버튼: 로그인 화면으로(가입은 로그인 화면에서도 이어진다) */}
        <div className="landing-header__actions">
          <Button size="lg" onClick={() => navigate('/login')}>
            시작하기
          </Button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="landing-eyebrow">할 일 · 일정 · 팀</p>
          <h1 className="landing-hero__headline">
            미뤄둔 일까지,
            <br />한 궤도에.
          </h1>
          <p className="landing-lead">
            일정은 시간표로, 백로그는 마감으로 한곳에서 정리해요. 친구·팀과 진행 상황을 나누고, 매일 출석해 레벨을 올려 보세요.
          </p>
          <div className="landing-hero__cta">
            <Button size="lg" onClick={start}>지금 시작하기</Button>
            <Button size="lg" variant="neutral" onClick={() => navigate('/login')}>
              로그인
            </Button>
          </div>
          <p className="landing-hero__note">가입하면 5,000P를 드려요</p>
        </div>

        <div className="landing-hero__visual">
          <div className="app-preview" aria-hidden="true" inert>
            <div className="app-preview__status">
              <LevelBadge type="progress" level={12} title="성실한 탐험가" currentExp={1240} requiredExp={2000} />
              <PointBalance amount={1250} onAdd={() => {}} />
            </div>
            <AttendanceStrip days={PREVIEW_WEEK} />
            <div className="app-preview__list">
              <p className="app-preview__label">일정</p>
              <TaskItem
                title="팀 주간 회의"
                startTime="10:00"
                endTime="11:00"
                category={{ name: '팀 프로젝트', color: BLUE }}
                visibility="TEAM"
                repeat
              />
              <TaskItem
                title="아침 운동 30분"
                done
                startTime="07:00"
                endTime="07:30"
                category={{ name: '건강', color: BLUE }}
                visibility="PRIVATE"
                repeat
              />
              <p className="app-preview__label app-preview__label--gap">백로그</p>
              <TaskItem
                type="backlog"
                title="보고서 초안 작성하기"
                due={{ label: 'D-2', tone: 'neutral' }}
                period="10.26 – 10.28"
                category={{ name: '업무', color: BLUE }}
                visibility="PRIVATE"
                subtasks={PREVIEW_SUBTASKS}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">할 일부터 팀까지</p>
          <h2 className="landing-section-heading__title">혼자서도, 함께해도 한 궤도에서</h2>
        </div>
        <div className="landing-features__cards">
          <FeatureCard icon={listTodoIcon} title="할 일 · 일정 · 백로그">
            일정은 시간표로, 백로그는 마감으로. 하위 할 일과 반복 일정까지 한 목록에서 관리해요.
          </FeatureCard>
          <FeatureCard icon={usersIcon} title="팔로우 · 타임라인">
            친구를 팔로우하고, 끝낸 할 일을 인증 글로 타임라인에 나눠요. 공개 범위는 카테고리마다 정해요.
          </FeatureCard>
          <FeatureCard icon={teamIcon} title="팀 · 역할 · 채팅">
            팀을 만들고 역할별 권한을 정해 함께 할 일을 나눠요. 이야기는 팀 채팅에서.
          </FeatureCard>
        </div>
      </section>

      <section className="landing-level">
        <div className="landing-level__showcase" aria-hidden="true">
          <AvatarSlot size="xl" ring level={12} />
          <div className="landing-level__badges">
            <LevelBadge level={12} />
            <PointBalance amount={1250} size="lg" onAdd={() => {}} />
          </div>
          <AttendanceStrip days={PREVIEW_WEEK} />
        </div>
        <div className="landing-level__copy">
          <p className="landing-eyebrow">출석 · 레벨 · 아바타</p>
          <h2 className="landing-section-heading__title">
            출석하고 레벨업,
            <br />
            포인트로 아바타 꾸미기
          </h2>
          <p className="landing-lead">
            매일 출석하면 500P와 경험치 10을 받아요. 레벨을 올리고, 모은 포인트로 상점에서 아바타 아이템을 골라 꾸며 보세요.
          </p>
          <Button size="lg" onClick={start}>시작하기</Button>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© Orbitflow 2026</span>
        <nav className="landing-footer__links" aria-label="약관">
          <Link to="/terms">이용약관</Link>
          <Link to="/privacy">개인정보처리방침</Link>
        </nav>
      </footer>
    </div>
  );
}
