import { useState } from 'react';
import { suspendUser, updateSuspension } from '../../api/admin';
import { getErrorMessage } from '../../api/axios';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { SuspensionFields } from './SuspensionFields';
import { periodBody } from '../../utils/admin';
import { showErrorToast } from '../../utils/errorToast';
import closeIcon from '../../assets/icons/close.svg';
import lockIcon from '../../assets/icons/lock.svg';

// 정지하기(user) 또는 진행 중인 정지의 기간·사유 수정(suspension). 저장되면 onDone
export function SuspensionModal({ user, suspension, onClose, onDone }) {
  const editing = Boolean(suspension);
  const [period, setPeriod] = useState(editing && !suspension.expiresAt ? 'permanent' : '7');
  const [reason, setReason] = useState(suspension?.reason ?? '');
  const [reasonError, setReasonError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      setReasonError('사유를 적어 주세요');
      return;
    }
    setReasonError(null);
    setBusy(true);
    try {
      const body = { reason: reason.trim(), ...periodBody(period) };
      if (editing) await updateSuspension(suspension.id, body);
      else await suspendUser({ userUuid: user.uuid, ...body });
      onDone();
    } catch (err) {
      showErrorToast(getErrorMessage(err, editing ? '정지를 수정하지 못했어요.' : '정지하지 못했어요.'));
      setBusy(false);
    }
  };

  const name = user?.nickname ?? suspension?.userNickname;

  return (
    <Modal busy={busy} label={editing ? '정지 기간 수정' : '정지하기'} className="modal--form account-modal" onClose={onClose}>
      <div className="modal__header">
        <div className="modal__title-group">
          <h2 className="modal__title">{editing ? '정지 기간 수정' : `${name}님 정지`}</h2>
          <p className="modal__subtitle">
            {editing ? '기간은 지금부터 다시 계산돼요' : '정지되면 바로 로그아웃되고 모든 기능을 쓸 수 없어요'}
          </p>
        </div>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </div>
      <SuspensionFields period={period} reason={reason} onPeriodChange={setPeriod} onReasonChange={setReason} reasonError={reasonError} />
      <div className="modal__actions">
        <Button variant="danger" iconLeft={lockIcon} disabled={busy} onClick={submit}>
          {editing ? '저장' : '정지하기'}
        </Button>
        <Button variant="neutral" onClick={onClose}>
          취소
        </Button>
      </div>
    </Modal>
  );
}
