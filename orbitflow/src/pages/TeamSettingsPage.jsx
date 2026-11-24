import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { getMyUuid } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import { getMyMembership, getTeam, getTeamMembers, getTeamRoles } from '../api/team';
import { BlacklistSection } from '../components/team/settings/BlacklistSection';
import { DangerSection } from '../components/team/settings/DangerSection';
import { GeneralSection } from '../components/team/settings/GeneralSection';
import { InvitesSection } from '../components/team/settings/InvitesSection';
import { MembersSection } from '../components/team/settings/MembersSection';
import { MyProfileSection } from '../components/team/settings/MyProfileSection';
import { RolesSection } from '../components/team/settings/RolesSection';
import { MobileTopBarTitle } from '../components/layout/MobileTopBar';
import { Button } from '../components/ui/Button';
import { LoadState } from '../components/ui/LoadState';
import { useReload } from '../hooks/useReload';
import { Tabs } from '../components/ui/Tabs';
import { TABLET_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { showErrorToast } from '../utils/errorToast';
import { hasPermission } from '../utils/team';

// manage: 팀 관리 권한이 있어야 보이는 항목. short: 태블릿 탭에 쓰는 짧은 이름
const SECTIONS = [
  { value: 'general', label: '일반', manage: true },
  { value: 'members', label: '구성원', manage: true },
  { value: 'roles', label: '역할 · 권한', manage: true },
  { value: 'invites', label: '초대 · 가입 신청', short: '초대 · 가입', manage: true },
  { value: 'blacklist', label: '블랙리스트', manage: true },
  { value: 'profile', label: '내 팀 프로필', short: '팀 프로필' },
  { value: 'danger', label: '위험 구역', danger: true },
];

async function loadSettings(teamUuid) {
  const [team, membership, members, myUuid] = await Promise.all([
    getTeam(teamUuid),
    getMyMembership(teamUuid),
    getTeamMembers(teamUuid),
    getMyUuid(),
  ]);
  const roles = hasPermission(membership, 'MANAGE_TEAM') ? await getTeamRoles(teamUuid) : [];
  return { team, membership, members, roles, myUuid };
}

// 팀 설정: 왼쪽 메뉴(?section=) + 오른쪽 내용. 팀 관리 권한이 없으면 내 팀 프로필·위험 구역만
export function TeamSettingsPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const { reloadKey, reload, loadFailed, setLoadFailed, retry } = useReload();
  const isTablet = useMediaQuery(TABLET_QUERY);


  useEffect(() => {
    let ignore = false;
    loadSettings(uuid)
      .then((loaded) => !ignore && setData(loaded))
      .catch((err) => {
        if (ignore) return;
        setLoadFailed(true);
        showErrorToast(getErrorMessage(err, '팀 설정을 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [uuid, reloadKey, setLoadFailed]);

  if (!data) {
    return (
      <div className="page team-settings">
        <LoadState failed={loadFailed} title="팀 설정을 불러오지 못했어요" onRetry={retry}>
          <Button variant="neutral" onClick={() => navigate('/teams')}>
            팀 목록으로
          </Button>
        </LoadState>
      </div>
    );
  }

  const { team, membership, members, roles, myUuid } = data;
  const canManage = hasPermission(membership, 'MANAGE_TEAM');
  const sections = SECTIONS.filter((item) => canManage || !item.manage);
  const requested = searchParams.get('section');
  const section = sections.some((item) => item.value === requested) ? requested : sections[0].value;
  const select = (value) => setSearchParams({ section: value });

  // 모바일은 메뉴 목록과 고른 항목을 한 화면씩: 주소에 항목이 있을 때만 내용을 보인다(team.css)
  return (
    <div className={classNames('page team-settings', { 'team-settings--picked': section === requested })}>
      <MobileTopBarTitle>팀 설정</MobileTopBarTitle>
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">팀 설정</h1>
          <p className="page__subtitle">{team.name}</p>
        </div>
        <Button variant="neutral" onClick={() => navigate(`/teams/${uuid}`)}>
          팀으로 돌아가기
        </Button>
      </header>

      <div className="team-settings__columns">
        {/* 태블릿은 왼쪽 메뉴 대신 위에 탭 한 줄 */}
        {isTablet ? (
          <Tabs
            items={sections.map((item) => ({ value: item.value, label: item.short ?? item.label }))}
            value={section}
            onChange={select}
            label="팀 설정 메뉴"
          />
        ) : (
          <nav className="settings-nav" aria-label="팀 설정 메뉴">
            {sections.map((item) => (
              <button
                key={item.value}
                type="button"
                className={classNames('settings-nav__item', {
                  'settings-nav__item--selected': item.value === section,
                  'settings-nav__item--danger': item.danger,
                })}
                aria-current={item.value === section ? 'page' : undefined}
                onClick={() => select(item.value)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div className="team-settings__body">
          {section === 'general' && <GeneralSection key={team.uuid} team={team} canManage={canManage} onSaved={reload} />}
          {section === 'members' && (
            <MembersSection
              team={team}
              members={members}
              roles={roles}
              membership={membership}
              myUuid={myUuid}
              onInvite={() => select('invites')}
              onChanged={reload}
            />
          )}
          {section === 'roles' && <RolesSection team={team} roles={roles} members={members} membership={membership} onChanged={reload} />}
          {section === 'invites' && (
            <InvitesSection team={team} members={members} onChanged={reload} />
          )}
          {section === 'blacklist' && <BlacklistSection team={team} members={members} />}
          {section === 'profile' && <MyProfileSection key={membership.uuid} team={team} membership={membership} onChanged={reload} />}
          {section === 'danger' && <DangerSection team={team} members={members} myUuid={myUuid} onChanged={reload} />}
        </div>
      </div>
    </div>
  );
}
