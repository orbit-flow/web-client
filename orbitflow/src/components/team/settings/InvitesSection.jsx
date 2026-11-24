import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../../api/axios';
import {
  acceptJoinRequest,
  cancelInvitation,
  getJoinRequests,
  getSentInvitations,
  inviteUser,
  rejectJoinRequest,
} from '../../../api/team';
import { PersonRow } from '../../social/PersonRow';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { UserPicker } from '../UserPicker';
import { formatShortDate, parseLocal } from '../../../utils/date';
import { showErrorToast } from '../../../utils/errorToast';
import { useReload } from '../../../hooks/useReload';

// 팀 설정 · 초대 · 가입 신청: 초대 보내기 · 보낸 초대(대기 중) · 받은 가입 신청
// 초대 API가 역할을 받지 않아 들어오는 사람은 모두 기본 역할을 받는다(화면에는 따로 적지 않는다)
// 보낸 초대 · 가입 신청이 비었을 때 안내는 카드 가운데
export function InvitesSection({ team, members, onChanged }) {
  const [picked, setPicked] = useState(null);
  const [lists, setLists] = useState({ invitations: [], requests: [] });
  const { reloadKey, reload } = useReload();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([getSentInvitations(team.uuid), getJoinRequests(team.uuid)])
      .then(([invitations, requests]) => !ignore && setLists({ invitations, requests }))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '초대·가입 신청을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [team.uuid, reloadKey]);

  const run = async (task, fallback, membersChanged = false) => {
    setBusy(true);
    try {
      await task();
      reload();
      if (membersChanged) onChanged();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const invite = (event) => {
    event.preventDefault();
    if (!picked) return;
    run(async () => {
      await inviteUser(team.uuid, picked.uuid);
      setPicked(null);
    }, '초대하지 못했어요.');
  };

  const { invitations, requests } = lists;

  return (
    <div className="settings-section">
      <form className="card settings-card" onSubmit={invite}>
        <div className="section-header">
          <h2 className="settings-card__title">초대 보내기</h2>
          <span className="section-header__hint">초대받은 사람은 팀 목록의 "받은 초대"에서 수락해요</span>
        </div>
        <div className="invite-form">
          <UserPicker
            placeholder="사용자 닉네임으로 찾기"
            value={picked}
            onPick={setPicked}
            exclude={new Set(members.map((member) => member.uuid))}
          />
          <Button type="submit" disabled={busy || !picked}>
            초대
          </Button>
        </div>
      </form>

      <section className="card settings-card" aria-label="보낸 초대">
        <div className="section-header">
          <h2 className="settings-card__title">보낸 초대</h2>
          <Badge>{invitations.length}</Badge>
        </div>
        {invitations.length === 0 ? (
          <p className="page__empty invites__empty">대기 중인 초대가 없어요</p>
        ) : (
          <div className="people-list">
            {invitations.map((invitation) => (
              <PersonRow
                key={invitation.uuid}
                uuid={invitation.inviteeUuid}
                nickname={invitation.inviteeNickname}
                subtitle={`${formatShortDate(parseLocal(invitation.createdAt))} 초대 · ${invitation.inviterNickname}`}
                avatarSize="sm"
                linkProfile={false}
              >
                <Badge>대기 중</Badge>
                <Button
                  variant="neutral"
                  dense
                  disabled={busy}
                  onClick={() => run(() => cancelInvitation(team.uuid, invitation.uuid), '초대를 취소하지 못했어요.')}
                >
                  초대 취소
                </Button>
              </PersonRow>
            ))}
          </div>
        )}
      </section>

      <section className="card settings-card" aria-label="가입 신청">
        <div className="section-header">
          <h2 className="settings-card__title">가입 신청</h2>
          <Badge>{requests.length}</Badge>
        </div>
        {team.isPrivate && <p className="field__hint">비공개 팀이라 새 가입 신청은 들어오지 않아요. 남아 있는 신청만 처리할 수 있어요.</p>}
        {requests.length === 0 ? (
          <p className="page__empty invites__empty">들어온 가입 신청이 없어요</p>
        ) : (
          <div className="people-list">
            {requests.map((request) => (
              <PersonRow
                key={request.uuid}
                uuid={request.userUuid}
                nickname={request.profileNickname ?? request.userNickname}
                profileImage={request.profileImage ?? request.userProfileImage}
                subtitle={[`${formatShortDate(parseLocal(request.createdAt))} 신청`, request.profileEmail].filter(Boolean).join(' · ')}
                avatarSize="sm"
                linkProfile={false}
              >
                <Button dense disabled={busy} onClick={() => run(() => acceptJoinRequest(request.uuid), '수락하지 못했어요.', true)}>
                  수락
                </Button>
                <Button variant="neutral" dense disabled={busy} onClick={() => run(() => rejectJoinRequest(request.uuid), '거절하지 못했어요.')}>
                  거절
                </Button>
              </PersonRow>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
