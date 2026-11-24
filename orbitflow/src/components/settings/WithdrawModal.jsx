import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyAvatar, getMyItems } from '../../api/avatar';
import { getErrorMessage } from '../../api/axios';
import { getMyTeams } from '../../api/team';
import { clearAccessToken } from '../../api/token';
import { deleteAccount } from '../../api/user';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { IconButton } from '../ui/IconButton';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { formatPoint } from '../../utils/avatar';
import { showErrorToast } from '../../utils/errorToast';
import closeIcon from '../../assets/icons/close.svg';

async function loadWithdrawInfo() {
  const [avatar, items, teams] = await Promise.all([getMyAvatar(), getMyItems(), getMyTeams()]);
  return { point: avatar.point ?? 0, itemCount: items.length, ownedTeams: teams.filter((team) => team.owner) };
}

// 회원 탈퇴(폭 460): 지워지는 것 안내 + 소유한 팀 확인 + 확인 문구 입력 + 동의
// 서버는 비밀번호가 아니라 "{이름}계정 삭제에 동의합니다." 문구로 본인 의사를 확인한다
export function WithdrawModal({ nickname, onClose }) {
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const phrase = `${nickname}계정 삭제에 동의합니다.`;

  useEffect(() => {
    let ignore = false;
    loadWithdrawInfo()
      .then((loaded) => !ignore && setInfo(loaded))
      .catch(() => !ignore && setInfo({ point: null, itemCount: null, ownedTeams: [] }));
    return () => {
      ignore = true;
    };
  }, []);

  const blocked = info?.ownedTeams.length > 0;
  const ready = agreed && confirmText.trim() === phrase && !blocked;

  const withdraw = async () => {
    setBusy(true);
    try {
      await deleteAccount(confirmText.trim());
      clearAccessToken();
      navigate('/', { replace: true });
    } catch (err) {
      showErrorToast(getErrorMessage(err, '탈퇴하지 못했어요.'));
      setBusy(false);
    }
  };

  return (
    <Modal busy={busy} label="회원 탈퇴" className="modal--form withdraw-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">정말 탈퇴할까요?</h2>
          <p className="modal__subtitle">탈퇴하면 되돌릴 수 없어요</p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>

      <div className="withdraw-modal__deleted">
        <strong>지워지는 것</strong>
        <ul>
          <li>할 일 · 카테고리 · 반복 일정 전부</li>
          <li>내가 쓴 게시글 · 댓글 · 좋아요</li>
          <li>
            {info?.point != null ? `포인트 ${formatPoint(info.point)}와 보유 아이템 ${info.itemCount}개` : '포인트와 보유 아이템'}
          </li>
          <li>팔로우 · 채팅 기록</li>
        </ul>
      </div>

      {blocked && (
        <div className="notice-box withdraw-modal__teams">
          <strong>소유한 팀이 {info.ownedTeams.length}개 있어요</strong>
          <p>
            {info.ownedTeams.map((team) => `"${team.name}"`).join(', ')}의 소유자를 먼저 다른 구성원에게 넘기거나 팀을 삭제해야 탈퇴할 수 있어요
          </p>
        </div>
      )}

      <Input
        label="확인 문구"
        value={confirmText}
        placeholder={phrase}
        hint={`"${phrase}"를 그대로 입력해 주세요`}
        disabled={blocked}
        onChange={(event) => setConfirmText(event.target.value)}
      />
      <Checkbox label="위 내용을 모두 확인했어요" checked={agreed} disabled={blocked} onChange={(event) => setAgreed(event.target.checked)} />
      <div className="modal__actions">
        <Button variant="danger" disabled={!ready || busy} onClick={withdraw}>
          탈퇴하기
        </Button>
        <Button variant="neutral" onClick={onClose}>
          취소
        </Button>
      </div>
    </Modal>
  );
}
