import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../api/axios';
import { getFollowings, toggleFollowNotification } from '../../api/follow';
import { AvatarSlot } from '../ui/AvatarSlot';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { showErrorToast } from '../../utils/errorToast';
import searchIcon from '../../assets/icons/search.svg';

// 서버가 알림 켜짐 여부를 돌려주지 않아, 이 브라우저에서 끈 사람만 기억한다(기본값은 켜짐)
const MUTED_KEY = 'followAlertsOff';

function readMuted() {
  try {
    return new Set(JSON.parse(localStorage.getItem(MUTED_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function writeMuted(set) {
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify([...set]));
  } catch {
    // 저장하지 못해도 서버 쪽 설정은 바뀌었다
  }
}

// 설정 · 팔로우 알림: 팔로잉한 사람이 할 일을 끝내거나 글을 쓰면 알림 받기(사람별 켜기·끄기)
export function FollowAlertsSection({ myUuid }) {
  const [people, setPeople] = useState(null);
  const [muted, setMuted] = useState(readMuted);
  const [keyword, setKeyword] = useState('');
  const [busyUuid, setBusyUuid] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    getFollowings(myUuid, { size: 100 })
      .then((page) => !ignore && setPeople(page.content.filter((person) => person.myState === 'ACCEPTED' || !person.myState)))
      .catch((err) => {
        if (ignore) return;
        setLoadFailed(true);
        showErrorToast(getErrorMessage(err, '팔로잉 목록을 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [myUuid]);

  const toggle = async (person) => {
    setBusyUuid(person.uuid);
    try {
      await toggleFollowNotification(person.uuid);
      setMuted((prev) => {
        const next = new Set(prev);
        if (next.has(person.uuid)) next.delete(person.uuid);
        else next.add(person.uuid);
        writeMuted(next);
        return next;
      });
    } catch (err) {
      showErrorToast(getErrorMessage(err, '알림 설정을 바꾸지 못했어요.'));
    } finally {
      setBusyUuid(null);
    }
  };

  const query = keyword.trim().toLowerCase();
  const visible = (people ?? []).filter((person) => person.nickname.toLowerCase().includes(query));

  return (
    <section id="settings-follow-alerts" className="card settings-card" aria-label="팔로우 알림">
      <div className="section-header">
        <h2 className="settings-card__heading">팔로우 알림</h2>
        <span className="section-header__hint">이 사람이 할 일을 완료하거나 글을 쓰면 알려 드려요</span>
      </div>
      <Input aria-label="팔로잉에서 찾기" iconLeft={searchIcon} placeholder="팔로잉에서 찾기" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
      {loadFailed && <p className="page__empty">불러오지 못했어요</p>}
      {people && visible.length === 0 ? (
        <p className="page__empty">{people.length === 0 ? '아직 팔로잉한 사람이 없어요' : '맞는 사람이 없어요'}</p>
      ) : (
        <div className="people-list">
          {visible.map((person) => (
            <div key={person.uuid} className="person-row">
              <AvatarSlot src={person.profileImage} size="sm" />
              <span className="person-row__text">
                <span className="person-row__name">{person.nickname}</span>
              </span>
              <Switch
                aria-label={`${person.nickname} 알림`}
                checked={!muted.has(person.uuid)}
                disabled={busyUuid === person.uuid}
                onChange={() => toggle(person)}
              />
            </div>
          ))}
        </div>
      )}
      <p className="field__hint">켜고 끈 상태는 이 브라우저에 기억해요. 다른 기기에서 바꿨다면 다르게 보일 수 있어요</p>
    </section>
  );
}
