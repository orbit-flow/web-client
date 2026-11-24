import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { getMyUuid } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import { getBlocks, toggleBlock } from '../api/follow';
import { logout } from '../api/auth';
import { getMe, unlinkSocialAccount, updateMe } from '../api/user';
import { findSocialProvider } from '../components/auth/socialProviders';
import { MobileTopBarTitle } from '../components/layout/MobileTopBar';
import { EmailChangeModal } from '../components/settings/EmailChangeModal';
import { FollowAlertsSection } from '../components/settings/FollowAlertsSection';
import { PasswordModal } from '../components/settings/PasswordModal';
import { ProfileSection } from '../components/settings/ProfileSection';
import { SettingRow } from '../components/settings/SettingRow';
import { WithdrawModal } from '../components/settings/WithdrawModal';
import { PersonRow } from '../components/social/PersonRow';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadState } from '../components/ui/LoadState';
import { useReload } from '../hooks/useReload';
import { Dialog } from '../components/ui/Dialog';
import { Switch } from '../components/ui/Switch';
import { Tabs } from '../components/ui/Tabs';
import { formatMonthDay, parseLocal } from '../utils/date';
import { MOBILE_QUERY, TABLET_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { showErrorToast } from '../utils/errorToast';

// 왼쪽 메뉴 → 구역 id. "회원 탈퇴"는 구역이 아니라 확인 창
const SECTIONS = [
  { value: 'profile', label: '프로필' },
  { value: 'account', label: '계정 · 보안' },
  { value: 'privacy', label: '공개 · 대화' },
  { value: 'follow-alerts', label: '팔로우 알림' },
  { value: 'blocks', label: '차단 목록' },
];
// 다른 화면에서 쓰는 이름(알림 화면의 "알림 설정" → ?section=notifications)
const ALIASES = { notifications: 'follow-alerts' };

const fullDate = (value) => {
  const date = parseLocal(value);
  return `${date.getFullYear()}.${formatMonthDay(date)}`;
};

async function loadSettings() {
  const [me, myUuid, blocks] = await Promise.all([getMe(), getMyUuid(), getBlocks()]);
  return { me, myUuid, blocks: blocks.content };
}

// 설정: 구역을 한 페이지에 쌓고, 왼쪽 메뉴는 누르면 그 구역으로 내려가며 보고 있는 구역을 표시한다
// 태블릿은 왼쪽 메뉴 대신 위쪽 탭(하는 일은 같음)
// 모바일은 왼쪽 메뉴 대신 "나" 화면에서 구역을 골라 들어온다(?section=): 그 구역만 보이고 제목도 구역 이름
export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);
  const [data, setData] = useState(null);
  const [active, setActive] = useState('profile');
  const [modal, setModal] = useState(null); // 'email' | 'password' | 'withdraw' | 'unlink'
  const { reloadKey, reload, loadFailed, setLoadFailed, retry } = useReload();
  const [busy, setBusy] = useState(false);
  const scrolledTo = useRef(false);


  useEffect(() => {
    let ignore = false;
    loadSettings()
      .then((loaded) => !ignore && setData(loaded))
      .catch((err) => {
        if (ignore) return;
        setLoadFailed(true);
        showErrorToast(getErrorMessage(err, '설정을 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey, setLoadFailed]);

  const scrollTo = (value) => {
    document.getElementById(`settings-${value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(value);
  };

  // 처음 열 때 ?section=으로 온 구역으로
  useEffect(() => {
    if (!data || scrolledTo.current) return;
    scrolledTo.current = true;
    const requested = searchParams.get('section');
    const target = ALIASES[requested] ?? requested;
    if (SECTIONS.some((item) => item.value === target)) {
      document.getElementById(`settings-${target}`)?.scrollIntoView({ block: 'start' });
    }
  }, [data, searchParams]);

  // 화면 위쪽 1/3에 걸린 구역을 메뉴에 표시
  useEffect(() => {
    if (!data) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace('settings-', ''));
      },
      { rootMargin: '0px 0px -66% 0px' },
    );
    SECTIONS.forEach((item) => {
      const element = document.getElementById(`settings-${item.value}`);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [data]);

  if (!data) {
    return (
      <div className="page settings-page">
        <LoadState failed={loadFailed} title="설정을 불러오지 못했어요" onRetry={retry} />
      </div>
    );
  }

  const { me, myUuid, blocks } = data;
  const social = me.socialAccount ? findSocialProvider(me.socialAccount.provider) : null;
  const requested = searchParams.get('section');
  const picked = isMobile ? SECTIONS.find((item) => item.value === (ALIASES[requested] ?? requested)) : null;
  const shows = (value) => !picked || picked.value === value;

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
      reload();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  // PATCH /users/me는 네 필드를 모두 받는다(소개가 없으면 null)
  const updatePrivacy = (patch) =>
    run(
      () =>
        updateMe({
          nickname: me.nickname,
          introduce: me.introduce ?? null,
          isPrivate: me.isPrivate,
          allowNonFollowChatInvite: me.allowNonFollowChatInvite,
          ...patch,
        }),
      '설정을 바꾸지 못했어요.',
    );

  return (
    <div className="page settings-page">
      <MobileTopBarTitle>{picked?.label ?? '설정'}</MobileTopBarTitle>
      <header className="page__header">
        <h1 className="page__title">설정</h1>
      </header>

      {isTablet && (
        <div className="settings-page__tabs">
          <Tabs items={SECTIONS} value={active} onChange={scrollTo} label="설정 메뉴" />
        </div>
      )}

      <div className="settings-page__columns">
        {!isTablet && (
          <nav className="settings-nav settings-page__nav" aria-label="설정 메뉴">
            {SECTIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={classNames('settings-nav__item', { 'settings-nav__item--selected': item.value === active })}
                aria-current={item.value === active ? 'true' : undefined}
                onClick={() => scrollTo(item.value)}
              >
                {item.label}
              </button>
            ))}
            <button type="button" className="settings-nav__item settings-nav__item--danger" onClick={() => setModal('withdraw')}>
              회원 탈퇴
            </button>
          </nav>
        )}

        <div className="settings-page__body">
          {shows('profile') && <ProfileSection key={`${me.nickname}-${me.introduce}`} me={me} onChanged={reload} />}

          {shows('account') && (
            <section id="settings-account" className="card settings-card" aria-label="계정 · 보안">
              <div className="section-header">
                <h2 className="settings-card__heading">계정 · 보안</h2>
              </div>
              <div className="setting-list">
                <SettingRow title="이메일" description={me.email}>
                  <Button variant="neutral" size="md" onClick={() => setModal('email')}>
                    변경
                  </Button>
                </SettingRow>
                <SettingRow title="비밀번호" description={me.hasPassword ? '설정돼 있어요' : '아직 없어요 · 설정하면 이메일로도 로그인할 수 있어요'}>
                  <Button variant="neutral" size="md" onClick={() => setModal('password')}>
                    {me.hasPassword ? '변경' : '설정'}
                  </Button>
                </SettingRow>
                <SettingRow
                  title="연결된 소셜 계정"
                  description={
                    me.socialAccount
                      ? `${social?.name ?? me.socialAccount.provider} · ${fullDate(me.socialAccount.linkedAt)} 연결${me.hasPassword ? '' : ' — 비밀번호가 있어야 연결을 해제할 수 있어요'}`
                      : '연결된 소셜 계정이 없어요'
                  }
                >
                  {me.socialAccount && (
                    <Button variant="ghost" size="md" disabled={busy || !me.hasPassword} onClick={() => setModal('unlink')}>
                      연결 해제
                    </Button>
                  )}
                </SettingRow>
                <SettingRow title="로그아웃" description="이 기기에서 로그아웃해요">
                  <Button variant="neutral" size="md" onClick={() => logout().then(() => window.location.assign('/login'))}>
                    로그아웃
                  </Button>
                </SettingRow>
                {/* 데스크톱은 왼쪽 메뉴 맨 아래, 모바일·태블릿은 메뉴가 없어 여기서 */}
                {(isMobile || isTablet) && (
                  <SettingRow title="회원 탈퇴" description="탈퇴하면 되돌릴 수 없어요">
                    <Button variant="ghost" size="md" className="settings-page__withdraw" onClick={() => setModal('withdraw')}>
                      탈퇴
                    </Button>
                  </SettingRow>
                )}
              </div>
            </section>
          )}

          {shows('privacy') && (
            <section id="settings-privacy" className="card settings-card" aria-label="공개 · 대화">
              <h2 className="settings-card__heading">공개 · 대화</h2>
              <div className="setting-list">
                <SettingRow title="비공개 계정" description="새 팔로우는 내 승인이 필요해요. 대시보드도 팔로워에게만 보여요">
                  <Switch aria-label="비공개 계정" checked={me.isPrivate} disabled={busy} onChange={() => updatePrivacy({ isPrivate: !me.isPrivate })} />
                </SettingRow>
                <SettingRow title="팔로우하지 않은 사람의 대화 초대 허용" description="끄면 팔로잉한 사람만 나를 대화에 초대할 수 있어요">
                  <Switch
                    aria-label="팔로우하지 않은 사람의 대화 초대 허용"
                    checked={me.allowNonFollowChatInvite}
                    disabled={busy}
                    onChange={() => updatePrivacy({ allowNonFollowChatInvite: !me.allowNonFollowChatInvite })}
                  />
                </SettingRow>
              </div>
            </section>
          )}

          {shows('follow-alerts') && <FollowAlertsSection myUuid={myUuid} />}

          {shows('blocks') && (
            <section id="settings-blocks" className="card settings-card" aria-label="차단 목록">
              <div className="section-header">
                <h2 className="settings-card__heading">차단 목록</h2>
                <Badge>{blocks.length}</Badge>
                <span className="section-header__hint">차단한 사람은 나를 찾거나 메시지를 보낼 수 없어요</span>
              </div>
              {blocks.length === 0 ? (
                <p className="page__empty">차단한 사람이 없어요</p>
              ) : (
                <div className="people-list">
                  {blocks.map((person) => (
                    <PersonRow
                      key={person.uuid}
                      uuid={person.uuid}
                      nickname={person.nickname}
                      profileImage={person.profileImage}
                      subtitle={`${fullDate(person.blockedAt)} 차단`}
                      avatarSize="sm"
                    >
                      <Button variant="neutral" size="md" disabled={busy} onClick={() => run(() => toggleBlock(person.uuid), '차단을 풀지 못했어요.')}>
                        차단 해제
                      </Button>
                    </PersonRow>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {modal === 'email' && (
        <EmailChangeModal
          onClose={() => setModal(null)}
          onChanged={() => {
            setModal(null);
            reload();
          }}
        />
      )}
      {modal === 'password' && (
        <PasswordModal
          hasPassword={me.hasPassword}
          onClose={() => setModal(null)}
          onChanged={() => {
            setModal(null);
            reload();
          }}
        />
      )}
      {modal === 'withdraw' && <WithdrawModal nickname={me.nickname} onClose={() => setModal(null)} />}
      {modal === 'unlink' && (
        <Dialog
          busy={busy}
          title={`${social?.name ?? '소셜'} 연결을 해제할까요?`}
          description="해제하면 그 계정으로는 로그인할 수 없고, 이메일·비밀번호로만 로그인해요."
          onClose={() => setModal(null)}
          actions={
            <>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => {
                  setModal(null);
                  run(() => unlinkSocialAccount(me.socialAccount.provider), '연결을 해제하지 못했어요.');
                }}
              >
                연결 해제
              </Button>
              <Button variant="neutral" onClick={() => setModal(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
