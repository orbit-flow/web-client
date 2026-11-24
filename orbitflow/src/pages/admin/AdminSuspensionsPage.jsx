import { useEffect, useState } from 'react';
import { getSuspensions, releaseSuspension } from '../../api/admin';
import { getErrorMessage } from '../../api/axios';
import { SuspensionModal } from '../../components/admin/SuspensionModal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Switch } from '../../components/ui/Switch';
import { Textarea } from '../../components/ui/Textarea';
import { SUSPENSION_STATUS } from '../../utils/admin';
import { formatMonthDay, parseLocal } from '../../utils/date';
import { showErrorToast } from '../../utils/errorToast';
import searchIcon from '../../assets/icons/search.svg';
import { useReload } from '../../hooks/useReload';

// 관리자 · 정지: 이름·이메일로 찾기, 진행 중인 정지만 보기, 기간 수정 · 해제
export function AdminSuspensionsPage() {
  const [keyword, setKeyword] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [items, setItems] = useState(null);
  const [panel, setPanel] = useState(null); // { type: 'edit' | 'release', suspension }
  const [releaseReason, setReleaseReason] = useState('');
  const { reloadKey, reload } = useReload();
  const [busy, setBusy] = useState(false);
  const query = keyword.trim();

  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      getSuspensions({ keyword: query, status: activeOnly ? 'ACTIVE' : undefined })
        .then((page) => !ignore && setItems(page.content))
        .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '정지 목록을 불러오지 못했어요.')));
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query, activeOnly, reloadKey]);

  const done = () => {
    setPanel(null);
    setReleaseReason('');
    reload();
  };

  const release = async () => {
    if (!releaseReason.trim()) return;
    setBusy(true);
    try {
      await releaseSuspension(panel.suspension.id, releaseReason.trim());
      done();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '해제하지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page admin-page">
      <header className="page__header">
        <h1 className="page__title">정지</h1>
        <p className="page__subtitle">정지된 사용자를 보고 기간을 바꾸거나 해제해요</p>
      </header>

      <div className="admin-toolbar">
        <Input aria-label="사용자 찾기" iconLeft={searchIcon} placeholder="닉네임 · 이메일" value={keyword} onChange={(event) => setKeyword(event.target.value)} className="admin-toolbar__search" />
        <span className="board-column__spacer" />
        <Switch label="진행 중인 정지만" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />
      </div>

      <div className="data-table admin-table admin-suspensions">
        <div className="data-table__head">
          <span className="admin-suspensions__user">사용자</span>
          <span className="data-table__grow">사유</span>
          <span className="admin-suspensions__date">시작</span>
          <span className="admin-suspensions__date">종료</span>
          <span className="admin-suspensions__status">상태</span>
          <span className="admin-suspensions__actions" />
        </div>
        {items && items.length === 0 && <p className="page__empty admin-table__empty">정지된 사용자가 없어요</p>}
        {items?.map((item) => {
          const status = SUSPENSION_STATUS[item.status];
          return (
            <div key={item.id} className="data-table__row admin-table__row">
              <span className="admin-suspensions__user">
                <span className="data-table__strong">{item.userNickname}</span>
                <span className="admin-table__sub">{item.userEmail}</span>
              </span>
              <span className="data-table__grow admin-table__ellipsis">{item.reason}</span>
              <span className="admin-suspensions__date num">{formatMonthDay(parseLocal(item.createdAt))}</span>
              <span className="admin-suspensions__date num">{item.expiresAt ? formatMonthDay(parseLocal(item.expiresAt)) : '영구'}</span>
              <span className="admin-suspensions__status">
                <Badge tone={status.tone}>{status.label}</Badge>
              </span>
              <span className="admin-suspensions__actions">
                {item.status === 'ACTIVE' && (
                  <>
                    <Button variant="neutral" dense onClick={() => setPanel({ type: 'edit', suspension: item })}>
                      기간 수정
                    </Button>
                    <Button variant="secondary" dense onClick={() => setPanel({ type: 'release', suspension: item })}>
                      해제
                    </Button>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {panel?.type === 'edit' && <SuspensionModal suspension={panel.suspension} onClose={() => setPanel(null)} onDone={done} />}
      {panel?.type === 'release' && (
        <Dialog
          busy={busy}
          title={`${panel.suspension.userNickname}님 정지를 해제할까요?`}
          description="바로 다시 로그인할 수 있게 돼요. 근거 신고의 제재 표시는 그대로 남아요."
          onClose={() => setPanel(null)}
          actions={
            <>
              <Button variant="neutral" onClick={() => setPanel(null)}>
                취소
              </Button>
              <Button disabled={busy || !releaseReason.trim()} onClick={release}>
                해제하기
              </Button>
            </>
          }
        >
          <Textarea label="해제 사유" value={releaseReason} maxLength={200} onChange={(event) => setReleaseReason(event.target.value)} />
        </Dialog>
      )}
    </div>
  );
}
