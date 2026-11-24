import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMyUuid } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import {
  acceptFollow,
  getFollowers,
  getFollowings,
  getFollowRequests,
  removeFollower,
  toggleBlock,
  toggleFollow,
  toggleFollowNotification,
} from '../api/follow';
import { searchUsers } from '../api/search';
import { getUserProfile } from '../api/user';
import { MobileTopBarTitle } from '../components/layout/MobileTopBar';
import { FollowButton } from '../components/social/FollowButton';
import { PersonRow } from '../components/social/PersonRow';
import { ReportModal } from '../components/social/ReportModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { parseLocal, timeAgo } from '../utils/date';
import { showErrorToast } from '../utils/errorToast';
import searchIcon from '../assets/icons/search.svg';
import { useReload } from '../hooks/useReload';

const TAB_VALUES = ['followers', 'followings', 'requests'];

// 친구: 팔로워 · 팔로잉 · 받은 요청 + 이름 찾기(입력하면 전체 사용자 검색도 함께)
export function FriendsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TAB_VALUES.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'followings';

  const [myUuid, setMyUuid] = useState(null);
  const [counts, setCounts] = useState({});
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [others, setOthers] = useState([]);
  const [report, setReport] = useState(null);
  const [notice, setNotice] = useState(null);
  const { reloadKey, reload } = useReload();


  // 입력이 멈추면 검색(0.3초)
  useEffect(() => {
    const timer = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // 탭 개수: 팔로워·팔로잉은 내 프로필, 받은 요청은 목록 전체 개수
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const uuid = await getMyUuid();
        const [profile, requestPage] = await Promise.all([getUserProfile(uuid), getFollowRequests({ size: 1 })]);
        if (ignore) return;
        setMyUuid(uuid);
        setCounts({ followers: profile.followerCount, followings: profile.followingCount, requests: requestPage.totalElements });
      } catch (err) {
        if (!ignore) showErrorToast(getErrorMessage(err, '친구 정보를 불러오지 못했어요.'));
      }
    })();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!myUuid) return;
    let ignore = false;
    const options = { keyword: query };
    const load =
      tab === 'followers' ? getFollowers(myUuid, options) : tab === 'requests' ? getFollowRequests(options) : getFollowings(myUuid, options);
    Promise.all([load, query ? searchUsers(query) : null])
      .then(([page, search]) => {
        if (ignore) return;
        setPeople(page.content);
        const listed = new Set(page.content.map((person) => person.uuid));
        setOthers(search ? search.content.filter((user) => !listed.has(user.uuid)) : []);
      })
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '목록을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [myUuid, tab, query, reloadKey]);

  const run = async (task, fallback, done) => {
    setNotice(null);
    try {
      await task();
      if (done) setNotice(done);
      reload();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    }
  };

  // 팔로우 버튼은 목록을 다시 불러오지 않고 그 줄의 버튼만 바꾼다 — 팔로잉 탭에서 끊어도 새로고침 전까지는 줄이 남아 있어 바로 다시 팔로우할 수 있다
  const followToggler = (person, stateKey, setList) => async () => {
    setNotice(null);
    try {
      const { state } = await toggleFollow(person.uuid);
      setList((list) => list.map((item) => (item.uuid === person.uuid ? { ...item, [stateKey]: state } : item)));
      const change = (state === 'ACCEPTED') - (person[stateKey] === 'ACCEPTED');
      if (change) setCounts((prev) => (prev.followings == null ? prev : { ...prev, followings: prev.followings + change }));
    } catch (err) {
      showErrorToast(getErrorMessage(err, '팔로우를 바꾸지 못했어요.'));
    }
  };

  const reportUser = (person) =>
    setReport({
      contentType: 'USER',
      targetUserUuid: person.uuid,
      description: `${person.nickname}님을 신고해요`,
      blockUuid: person.uuid,
    });

  const blockItem = (person) => ({
    label: person.blockedByMe ? '차단 해제' : '차단',
    danger: !person.blockedByMe,
    onClick: () => run(() => toggleBlock(person.uuid), '차단을 바꾸지 못했어요.'),
  });

  const rowFor = (person) => {
    if (tab === 'requests') {
      return (
        <PersonRow key={person.followId} {...person} subtitle={`${timeAgo(parseLocal(person.followAt))} 요청`} menuItems={[blockItem(person), { label: '신고', onClick: () => reportUser(person) }]}>
          <Button size="sm" onClick={() => run(() => acceptFollow(person.followId), '수락하지 못했어요.')}>
            수락
          </Button>
          <Button variant="neutral" size="sm" onClick={() => run(() => removeFollower(person.followId), '거절하지 못했어요.')}>
            거절
          </Button>
        </PersonRow>
      );
    }
    const follower = tab === 'followers';
    return (
      <PersonRow
        key={person.uuid}
        {...person}
        subtitle={follower && person.myState === 'ACCEPTED' ? '맞팔로우' : `${timeAgo(parseLocal(person.followAt))} 팔로우`}
        menuItems={[
          !follower && {
            label: '활동 알림 켜기 · 끄기',
            onClick: () => run(() => toggleFollowNotification(person.uuid), '알림 설정을 바꾸지 못했어요.', `${person.nickname}님의 활동 알림을 바꿨어요`),
          },
          follower && { label: '팔로워 삭제', danger: true, onClick: () => run(() => removeFollower(person.followId), '팔로워를 삭제하지 못했어요.') },
          blockItem(person),
          { label: '신고', onClick: () => reportUser(person) },
        ]}
      >
        <FollowButton
          state={person.myState}
          followerState={follower ? 'ACCEPTED' : undefined}
          onClick={followToggler(person, 'myState', setPeople)}
        />
      </PersonRow>
    );
  };

  return (
    <div className="page friends-page">
      <MobileTopBarTitle>친구</MobileTopBarTitle>
      <header className="page__header page__header--row">
        <h1 className="page__title">친구</h1>
        <Button variant="neutral" size="md" onClick={() => navigate('/timeline')}>
          타임라인 보기
        </Button>
      </header>

      <div className="friends-page__body">
        <Tabs
          items={[
            { value: 'followers', label: '팔로워', count: counts.followers },
            { value: 'followings', label: '팔로잉', count: counts.followings },
            { value: 'requests', label: '받은 요청', count: counts.requests },
          ]}
          value={tab}
          onChange={(value) => setSearchParams({ tab: value })}
          label="친구 목록"
        />
        <Input
          aria-label="이름으로 찾기"
          placeholder="이름으로 찾기"
          iconLeft={searchIcon}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />

        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}

        {people.length > 0 ? (
          <div className="people-list">{people.map(rowFor)}</div>
        ) : (
          <p className="page__empty">{query ? '이 목록에서 찾은 사람이 없어요' : '아직 아무도 없어요'}</p>
        )}

        {others.length > 0 && (
          <section className="friends-page__search" aria-label="다른 사용자">
            <h2 className="section-header__title">다른 사용자</h2>
            <div className="people-list">
              {others.map((user) => (
                <PersonRow
                  key={user.uuid}
                  {...user}
                  subtitle={user.introduce ?? (user.isPrivate ? '비공개 계정' : `팔로워 ${user.followerCount}`)}
                  menuItems={[blockItem(user), { label: '신고', onClick: () => reportUser(user) }]}
                >
                  <FollowButton state={user.followState} onClick={followToggler(user, 'followState', setOthers)} />
                </PersonRow>
              ))}
            </div>
          </section>
        )}

      </div>

      {report && <ReportModal target={report} onClose={() => setReport(null)} onBlocked={reload} />}
    </div>
  );
}
