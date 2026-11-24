import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../api/axios';
import { addToBlacklist, getBlacklist, removeFromBlacklist } from '../../../api/team';
import { PersonRow } from '../../social/PersonRow';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { GlyphButton } from '../../ui/GlyphButton';
import { UserPicker } from '../UserPicker';
import { formatShortDate, parseLocal } from '../../../utils/date';
import { showErrorToast } from '../../../utils/errorToast';
import plusIcon from '../../../assets/icons/plus.svg';
import { useReload } from '../../../hooks/useReload';

// 팀 설정 · 블랙리스트: 위 입력 칸에서 사람을 골라 오른쪽 + 로 등록(구성원이 아닌 사람만), 아래 목록에서 해제
export function BlacklistSection({ team, members }) {
  const [list, setList] = useState([]);
  const [picked, setPicked] = useState(null);
  const { reloadKey, reload } = useReload();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    getBlacklist(team.uuid)
      .then((items) => !ignore && setList(items))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '블랙리스트를 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [team.uuid, reloadKey]);

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

  const add = (event) => {
    event.preventDefault();
    if (!picked) return;
    run(async () => {
      await addToBlacklist(team.uuid, picked.uuid);
      setPicked(null);
    }, '블랙리스트에 올리지 못했어요.');
  };

  return (
    <section className="settings-section" aria-label="블랙리스트">
      <div className="section-header">
        <h2 className="section-header__title">블랙리스트</h2>
        <Badge>{list.length}</Badge>
        <span className="section-header__hint">블랙리스트에 있는 사람은 가입 신청도, 초대도 받을 수 없어요</span>
      </div>
      <form className="card invite-form" onSubmit={add}>
        <UserPicker
          label="막을 사용자"
          value={picked}
          onPick={setPicked}
          exclude={new Set([...members.map((member) => member.uuid), ...list.map((item) => item.userUuid)])}
        />
        <GlyphButton type="submit" icon={plusIcon} label="블랙리스트에 등록" className="blacklist-form__add" disabled={busy || !picked} />
      </form>
      {list.length === 0 ? (
        <p className="page__empty">블랙리스트가 비어 있어요</p>
      ) : (
        <div className="people-list">
          {list.map((item) => (
            <PersonRow
              key={item.userUuid}
              uuid={item.userUuid}
              nickname={item.nickname}
              profileImage={item.profileImage}
              subtitle={`${formatShortDate(parseLocal(item.blacklistedAt))} 추가`}
              avatarSize="sm"
            >
              <Button variant="neutral" dense disabled={busy} onClick={() => run(() => removeFromBlacklist(team.uuid, item.userUuid), '해제하지 못했어요.')}>
                해제
              </Button>
            </PersonRow>
          ))}
        </div>
      )}
      <p className="notice-box">
        구성원을 내보낼 때 "블랙리스트에 추가"를 고르면 여기에 함께 등록돼요. 해제해도 팀에 다시 들어오지는 않아요.
      </p>
    </section>
  );
}
