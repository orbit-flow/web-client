import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/axios';
import {
  acceptInvitation,
  cancelJoinRequest,
  getMyInvitations,
  getMyTeams,
  rejectInvitation,
  requestJoin,
  searchTeams,
} from '../api/team';
import { DeletedTeamsModal } from '../components/team/DeletedTeamsModal';
import { TeamCard } from '../components/team/TeamCard';
import { TeamFormModal } from '../components/team/TeamFormModal';
import { TeamProfileModal } from '../components/team/TeamProfileModal';
import { TeamRow } from '../components/team/TeamRow';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { parseLocal, timeAgo } from '../utils/date';
import { showErrorToast } from '../utils/errorToast';
import { useToast } from '../hooks/useRealtime';
import plusIcon from '../assets/icons/plus.svg';
import rotateIcon from '../assets/icons/rotate-ccw.svg';
import searchIcon from '../assets/icons/search.svg';
import { useReload } from '../hooks/useReload';

// 팀 목록: 받은 초대 · 내 팀 카드 · 공개 팀 찾기 · 삭제한 팀 복구
export function TeamListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [teams, setTeams] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState(null);
  const [modal, setModal] = useState(null); // 'create' | 'deleted'
  const [joining, setJoining] = useState(null); // { mode: 'request', team } | { mode: 'accept', invitation } — 팀 프로필 창
  const { reloadKey, reload } = useReload();
  const [busy, setBusy] = useState(false);

  const query = keyword.trim();

  useEffect(() => {
    let ignore = false;
    Promise.all([getMyTeams(), getMyInvitations()])
      .then(([myTeams, myInvitations]) => {
        if (ignore) return;
        setTeams(myTeams);
        setInvitations(myInvitations);
      })
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '팀을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // 입력이 멈추면 찾는다
  useEffect(() => {
    if (!query) return undefined;
    let ignore = false;
    const timer = setTimeout(() => {
      searchTeams(query)
        .then((page) => !ignore && setResults(page.content))
        .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '팀을 찾지 못했어요.')));
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query, reloadKey]);

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

  const searchAction = (team) => {
    if (team.member) {
      return (
        <Button variant="ghost" dense onClick={() => navigate(`/teams/${team.uuid}`)}>
          들어가기
        </Button>
      );
    }
    if (team.joinRequested) {
      return (
        <>
          <span className="team-row__requested">신청함</span>
          <Button variant="neutral" dense disabled={busy} onClick={() => run(() => cancelJoinRequest(team.uuid), '신청을 취소하지 못했어요.')}>
            신청 취소
          </Button>
        </>
      );
    }
    return (
      <Button variant="secondary" dense disabled={busy} onClick={() => setJoining({ mode: 'request', team })}>
        가입 신청
      </Button>
    );
  };

  return (
    <div className="page team-list-page">
      <header className="page__header">
        <h1 className="page__title">팀</h1>
      </header>

      {invitations.length > 0 && (
        <section className="team-section" aria-label="받은 초대">
          <div className="section-header">
            <h2 className="section-header__title">받은 초대</h2>
            <Badge>{invitations.length}</Badge>
          </div>
          <div className="team-list">
            {invitations.map((invitation) => (
              <TeamRow
                key={invitation.uuid}
                name={invitation.teamName}
                icon={invitation.teamIcon}
                subtitle={`${invitation.inviterNickname}님이 초대했어요 · ${timeAgo(parseLocal(invitation.createdAt))}`}
              >
                <Button variant="secondary" dense disabled={busy} onClick={() => run(() => rejectInvitation(invitation.uuid), '거절하지 못했어요.')}>
                  거절
                </Button>
                <Button dense disabled={busy} onClick={() => setJoining({ mode: 'accept', invitation })}>
                  수락
                </Button>
              </TeamRow>
            ))}
          </div>
        </section>
      )}

      <section className="team-section" aria-label="내 팀">
        <div className="section-header">
          <h2 className="section-header__title">내 팀</h2>
          <Badge>{teams?.length ?? 0}</Badge>
          <Button variant="secondary" size="md" iconLeft={plusIcon} className="section-header__action" onClick={() => setModal('create')}>
            팀 만들기
          </Button>
        </div>
        {teams && teams.length === 0 && (
          <div className="empty-state empty-state--card">
            <p className="empty-state__title">아직 소속된 팀이 없어요</p>
            <p className="empty-state__desc">팀을 만들거나 아래에서 공개 팀을 찾아 가입을 신청해 보세요</p>
          </div>
        )}
        {teams && teams.length > 0 && (
          <div className="team-grid">
            {teams.map((team) => (
              <TeamCard key={team.uuid} team={team} />
            ))}
          </div>
        )}
      </section>

      <section className="team-section team-section--search" aria-label="공개 팀 찾기">
        <div className="section-header">
          <h2 className="section-header__title">공개 팀 찾기</h2>
        </div>
        <Input aria-label="팀 이름" iconLeft={searchIcon} placeholder="팀 이름" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        {query && results && results.length === 0 && <p className="page__empty">"{query}"에 맞는 팀이 없어요</p>}
        {query && results && results.length > 0 && (
          <div className="team-list">
            {results.map((team) => (
              <TeamRow key={team.uuid} name={team.name} icon={team.icon} subtitle={team.description} meta={`구성원 ${team.memberCount}`}>
                {searchAction(team)}
              </TeamRow>
            ))}
          </div>
        )}
      </section>

      <div>
        <Button variant="ghost" size="md" iconLeft={rotateIcon} className="btn--muted" onClick={() => setModal('deleted')}>
          삭제한 팀 복구 (30일 이내)
        </Button>
      </div>

      {joining && (
        <TeamProfileModal
          mode={joining.mode}
          teamName={joining.mode === 'accept' ? joining.invitation.teamName : joining.team.name}
          onClose={() => setJoining(null)}
          onSubmit={async (profile, image) => {
            if (joining.mode === 'accept') await acceptInvitation(joining.invitation.uuid, profile, image);
            else await requestJoin(joining.team.uuid, profile, image);
            toast(joining.mode === 'accept' ? '초대를 수락했어요' : '가입을 신청했어요');
            setJoining(null);
            reload();
          }}
        />
      )}
      {modal === 'create' && (
        <TeamFormModal onClose={() => setModal(null)} onCreated={(team) => navigate(`/teams/${team.uuid}`)} />
      )}
      {modal === 'deleted' && (
        <DeletedTeamsModal
          onClose={() => setModal(null)}
          onRestored={(team) => {
            setModal(null);
            navigate(`/teams/${team.uuid}`);
          }}
        />
      )}
    </div>
  );
}
