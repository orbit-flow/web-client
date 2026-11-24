import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getMyUuid } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import { deleteCategory } from '../api/category';
import { openTeamDirectChat } from '../api/chat';
import { getTeamPosts } from '../api/post';
import {
  cancelJoinRequest,
  getMyMembership,
  getTeam,
  getTeamCategories,
  getTeamCategoryProgress,
  getTeamMembers,
  getTeamRoles,
  requestJoin,
} from '../api/team';
import { PostCard } from '../components/social/PostCard';
import { PostDetailModal } from '../components/social/PostDetailModal';
import { ChatroomCreateModal } from '../components/team/ChatroomCreateModal';
import { MemberTable } from '../components/team/MemberTable';
import { InvitesSection } from '../components/team/settings/InvitesSection';
import { TeamCategoryModal } from '../components/team/TeamCategoryModal';
import { TeamCategoryTable } from '../components/team/TeamCategoryTable';
import { TeamChatPanel } from '../components/team/TeamChatPanel';
import { MobileTopBarActions, MobileTopBarTitle } from '../components/layout/MobileTopBar';
import { RoleTag } from '../components/team/RoleTag';
import { TeamHeader } from '../components/team/TeamHeader';
import { TeamIcon } from '../components/team/TeamIcon';
import { TeamProfileModal } from '../components/team/TeamProfileModal';
import { TeamHomeTab } from '../components/team/TeamHomeTab';
import { TeamStatCard } from '../components/team/TeamStatCard';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadState } from '../components/ui/LoadState';
import { Dialog } from '../components/ui/Dialog';
import { GlyphButton } from '../components/ui/GlyphButton';
import { IconButton } from '../components/ui/IconButton';
import { EmptyHint } from '../components/ui/Icon';
import { Tabs } from '../components/ui/Tabs';
import { useRealtime, useToast } from '../hooks/useRealtime';
import { useReload } from '../hooks/useReload';
import { showErrorToast } from '../utils/errorToast';
import { fromPost } from '../utils/post';
import { hasPermission } from '../utils/team';
import dashboardIcon from '../assets/icons/dashboard.svg';
import imageIcon from '../assets/icons/image.svg';
import messageIcon from '../assets/icons/message.svg';
import plusIcon from '../assets/icons/plus.svg';
import settingsButtonIcon from '../assets/icons/settings-button.svg';
import settingsIcon from '../assets/icons/settings.svg';

// 구성원 전용 데이터. 실패해도 팀 정보는 보여 준다
async function loadMemberData(teamUuid) {
  const [membership, categories, members] = await Promise.all([
    getMyMembership(teamUuid),
    getTeamCategories(teamUuid),
    getTeamMembers(teamUuid),
  ]);
  const roles = hasPermission(membership, 'MANAGE_TEAM') ? await getTeamRoles(teamUuid) : null;
  const progressList = await Promise.all(
    categories.map((category) => getTeamCategoryProgress(teamUuid, category.id).catch(() => null)),
  );
  return {
    membership,
    categories,
    members,
    roles,
    progress: new Map(progressList.filter(Boolean).map((item) => [item.categoryId, item])),
  };
}

const EMPTY = { membership: null, categories: [], members: [], roles: null, progress: new Map() };

// 팀 메인: 머리 + 숫자 카드 + 홈·카테고리·구성원·채팅방 탭(?tab=, 채팅방은 ?room=)
export function TeamMainPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'home';
  const roomUuid = searchParams.get('room');
  const [team, setTeam] = useState(null);
  const [data, setData] = useState(EMPTY);
  const [myUuid, setMyUuid] = useState(null);
  const [filterIds, setFilterIds] = useState([]);
  const [modal, setModal] = useState(null); // { type: 'chatroom' } | { type: 'category', category? } | { type: 'delete-category', category } | { type: 'join' }
  const { reloadKey, reload, loadFailed, setLoadFailed, retry } = useReload();
  const [busy, setBusy] = useState(false);

  const { rooms: allRooms, reloadRooms } = useRealtime();
  const toast = useToast();

  useEffect(() => {
    let ignore = false;
    Promise.all([getTeam(uuid), getMyUuid()])
      .then(async ([detail, me]) => {
        if (ignore) return;
        setTeam(detail);
        setMyUuid(me);
        if (!detail.member) return;
        const loaded = await loadMemberData(uuid);
        if (!ignore) setData(loaded);
      })
      .catch((err) => {
        if (ignore) return;
        setLoadFailed(true);
        showErrorToast(getErrorMessage(err, '팀을 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [uuid, reloadKey, setLoadFailed]);

  const go = (nextTab, extra = {}) => setSearchParams({ tab: nextTab, ...extra });

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

  const openDirect = (member) =>
    run(async () => {
      const room = await openTeamDirectChat(uuid, member.uuid);
      await reloadRooms();
      go('chatrooms', { room: room.uuid });
    }, '대화를 열지 못했어요.');

  if (!team) {
    return (
      <div className="page team-page">
        <LoadState failed={loadFailed} title="팀을 불러오지 못했어요" onRetry={retry}>
          <Button variant="neutral" onClick={() => navigate('/teams')}>
            팀 목록으로
          </Button>
        </LoadState>
      </div>
    );
  }

  const { membership, categories, members, roles, progress } = data;
  const rooms = allRooms.filter((room) => room.teamUuid === uuid);
  const canManageCategories = hasPermission(membership, 'CREATE_CATEGORIES');
  const canManageTeam = hasPermission(membership, 'MANAGE_TEAM');
  const tabs = [
    { value: 'home', label: '홈' },
    { value: 'categories', label: '카테고리', count: categories.length },
    { value: 'members', label: '구성원', count: team.memberCount },
    { value: 'chatrooms', label: '채팅방', count: rooms.length },
    { value: 'posts', label: '게시글' },
  ];

  return (
    <div className="page team-page">
      {/* 모바일 상단바: 아이콘 · 팀 이름 · 내 역할, 그 아래 공개 범위 · 구성원 수(화면 안 팀 머리의 같은 내용은 숨김) */}
      <MobileTopBarTitle>
        <span className="team-top-title">
          <TeamIcon name={team.name} icon={team.icon} size="sm" />
          <span className="team-top-title__main">
            <span className="team-top-title__name">{team.name}</span>
            {team.member && <RoleTag owner={team.owner} name={team.myRoleName} color={team.myRoleColor} size="md" />}
          </span>
          <span className="team-top-title__meta">
            {team.isPrivate ? '비공개 팀' : '공개 팀'} · 구성원 {team.memberCount}명
          </span>
        </span>
      </MobileTopBarTitle>
      {team.member && (
        <MobileTopBarActions>
          <GlyphButton icon={messageIcon} label="팀 채팅" size={24} onClick={() => go('chatrooms')} />
          <GlyphButton icon={settingsIcon} label="팀 설정" size={24} onClick={() => navigate(`/teams/${uuid}/settings`)} />
        </MobileTopBarActions>
      )}

      <TeamHeader team={team}>
        {team.member ? (
          <>
            <Button variant="secondary" iconLeft={messageIcon} className="team-header__member-action" onClick={() => go('chatrooms')}>
              팀 채팅
            </Button>
            <IconButton
              icon={settingsButtonIcon}
              label="팀 설정"
              className="team-header__member-action"
              onClick={() => navigate(`/teams/${uuid}/settings`)}
            />
          </>
        ) : team.joinRequested ? (
          <Button variant="neutral" disabled={busy} onClick={() => run(() => cancelJoinRequest(uuid), '신청을 취소하지 못했어요.')}>
            신청 취소
          </Button>
        ) : (
          <Button disabled={busy} onClick={() => setModal({ type: 'join' })}>
            가입 신청
          </Button>
        )}
      </TeamHeader>

      {!team.member ? (
        <div className="empty-state empty-state--card">
          <p className="empty-state__title">구성원만 볼 수 있어요</p>
          <p className="empty-state__desc">
            {team.joinRequested ? '가입 신청을 보냈어요. 팀 관리자가 수락하면 들어올 수 있어요.' : '가입을 신청하면 팀 관리자가 확인해요.'}
          </p>
        </div>
      ) : (
        <>
          <div className="team-stats">
            <TeamStatCard label="내 남은 할 일" value={team.myRemainingTodos} />
            <TeamStatCard label="마감 지남" value={team.overdueCount} danger={team.overdueCount > 0} />
            <TeamStatCard label="이번 주 배정" value={team.assignedThisWeek} />
            <TeamStatCard label="팀 할 일" value={team.teamTodoCount} />
          </div>

          <Tabs items={tabs} value={tab} onChange={(value) => go(value)} label="팀 보기" />

          {tab === 'home' && (
            <TeamHomeTab
              teamUuid={uuid}
              categories={categories}
              progress={progress}
              members={members}
              membership={membership}
              myUuid={myUuid}
              selectedIds={filterIds}
              onSelectedIdsChange={setFilterIds}
              onManageCategories={() => go('categories')}
              onChanged={reload}
            />
          )}

          {tab === 'categories' && (
            <section className="team-tab" aria-label="카테고리">
              <div className="section-header">
                <h2 className="section-header__title">카테고리</h2>
                <Badge>{categories.length}</Badge>
                <span className="section-header__hint">내가 볼 수 있는 팀 카테고리 · 누르면 홈에서 이 카테고리만 보기</span>
                <span className="board-column__spacer" />
                {canManageCategories && (
                  <Button variant="secondary" dense iconLeft={plusIcon} onClick={() => setModal({ type: 'category' })}>
                    카테고리
                  </Button>
                )}
              </div>
              {categories.length === 0 ? (
                <EmptyHint icon={dashboardIcon} title="팀 카테고리가 없어요" />
              ) : (
                <TeamCategoryTable
                  categories={categories}
                  progress={progress}
                  onOpen={(category) => {
                    setFilterIds([category.id]);
                    go('home');
                  }}
                  menuItems={
                    canManageCategories
                      ? (category) => [
                          { label: '수정', onClick: () => setModal({ type: 'category', category }) },
                          { label: '삭제', danger: true, onClick: () => setModal({ type: 'delete-category', category }) },
                        ]
                      : undefined
                  }
                />
              )}
            </section>
          )}

          {tab === 'members' && (
            <section className="team-tab" aria-label="구성원">
              <div className="section-header">
                <h2 className="section-header__title">구성원</h2>
                <Badge>{members.length}</Badge>
                <span className="section-header__hint">내보내기·역할 변경은 팀 설정에서</span>
              </div>
              <MemberTable members={members} myUuid={myUuid} onChat={openDirect} />
              {/* 팀 관리 권한이 있으면 구성원 아래에서 바로 초대 · 가입 신청 처리(팀 설정의 같은 구역) */}
              {canManageTeam && roles && (
                <InvitesSection team={team} members={members} onChanged={reload} />
              )}
            </section>
          )}

          {tab === 'chatrooms' && (
            <TeamChatPanel
              rooms={rooms}
              selectedUuid={roomUuid}
              onSelect={(room) => go('chatrooms', { room })}
              onCreate={() => setModal({ type: 'chatroom' })}
            />
          )}

          {tab === 'posts' && <TeamPostsTab teamUuid={uuid} categories={categories} myUuid={myUuid} />}
        </>
      )}

      {modal?.type === 'join' && (
        <TeamProfileModal
          mode="request"
          teamName={team.name}
          onClose={() => setModal(null)}
          onSubmit={async (profile, image) => {
            await requestJoin(uuid, profile, image);
            toast('가입을 신청했어요');
            setModal(null);
            reload();
          }}
        />
      )}
      {modal?.type === 'chatroom' && (
        <ChatroomCreateModal
          teamUuid={uuid}
          members={members}
          roles={roles}
          myUuid={myUuid}
          onClose={() => setModal(null)}
          onCreated={(room) => {
            setModal(null);
            reloadRooms();
            go('chatrooms', { room: room.uuid });
          }}
        />
      )}
      {modal?.type === 'category' && (
        <TeamCategoryModal
          teamUuid={uuid}
          teamPrivate={team.isPrivate}
          category={modal.category}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reload();
          }}
        />
      )}
      {modal?.type === 'delete-category' && (
        <Dialog
          busy={busy}
          title="카테고리 삭제"
          description={`"${modal.category.name}"의 할 일·반복 일정·게시글이 모두 지워지고 되돌릴 수 없어요.`}
          onClose={() => setModal(null)}
          actions={
            <>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => {
                  setModal(null);
                  run(() => deleteCategory(modal.category.id), '카테고리를 지우지 못했어요.');
                }}
              >
                삭제
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

// 팀 게시글 탭: 팀 카테고리 할 일에 쓴 글 중 내가 볼 수 있는 것(최신순). 누르면 게시글 상세 창
function TeamPostsTab({ teamUuid, categories, myUuid }) {
  const [posts, setPosts] = useState(null);
  const [openPostId, setOpenPostId] = useState(null);
  const { reloadKey, reload } = useReload();
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  useEffect(() => {
    let ignore = false;
    getTeamPosts(teamUuid, { size: 50 })
      .then((page) => !ignore && setPosts(page.content))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '팀 게시글을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [teamUuid, reloadKey]);

  return (
    <section className="team-tab" aria-label="게시글">
      {posts && posts.length === 0 && (
        <EmptyHint icon={imageIcon} title="아직 팀 게시글이 없어요" description={'팀 할 일을 열어 "글 쓰기"로 남겨 보세요'} />
      )}
      {posts && posts.length > 0 && (
        <div className="dashboard-posts__list">
          {posts.map((post) => (
            <PostCard key={post.id} post={fromPost(post, categoriesById)} onOpen={() => setOpenPostId(post.id)} />
          ))}
        </div>
      )}
      {openPostId && (
        <PostDetailModal
          postId={openPostId}
          myUuid={myUuid}
          categoriesById={categoriesById}
          onClose={() => setOpenPostId(null)}
          onChanged={reload}
        />
      )}
    </section>
  );
}
