import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAdminUser, getUserPointTransactions, revokeTransaction } from '../../api/admin';
import { getErrorMessage } from '../../api/axios';
import { SuspensionModal } from '../../components/admin/SuspensionModal';
import { findSocialProvider } from '../../components/auth/socialProviders';
import { AvatarSlot } from '../../components/ui/AvatarSlot';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { formatPoint } from '../../utils/avatar';
import { formatMonthDay, formatTime, parseLocal } from '../../utils/date';
import { showErrorToast } from '../../utils/errorToast';
import lockIcon from '../../assets/icons/lock.svg';
import rotateIcon from '../../assets/icons/rotate-ccw.svg';
import searchIcon from '../../assets/icons/search.svg';

const TRANSACTION_LABELS = {
  SIGNUP: '가입 축하 포인트',
  ATTENDANCE: '출석 체크',
  LEVEL_UP: '레벨 업 보상',
  PURCHASE: '충전',
  USE: '상점 구매',
  REFUND: '충전 환불',
  REVOKE: '출석 포인트 회수',
};

const dateTime = (value) => {
  const date = parseLocal(value);
  return `${formatMonthDay(date)} ${formatTime(date)}`;
};

async function loadUser(uuid) {
  const [user, transactions, attendance] = await Promise.all([
    getAdminUser(uuid),
    getUserPointTransactions(uuid),
    getUserPointTransactions(uuid, { type: 'ATTENDANCE', size: 1 }),
  ]);
  return { user, transactions, attendanceCount: attendance.totalElements };
}

// 관리자 · 사용자 조회: uuid로 찾아 기본 정보 · 포인트 내역(출석 적립 회수) · 정지하기
export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [uuid, setUuid] = useState(searchParams.get('uuid') ?? '');
  const [data, setData] = useState(null);
  const [panel, setPanel] = useState(null); // { type: 'suspend' } | { type: 'revoke', transaction }
  const [busy, setBusy] = useState(false);

  const lookup = async (target = uuid.trim()) => {
    if (!target) return;
    setBusy(true);
    try {
      setData(await loadUser(target));
      setSearchParams({ uuid: target }, { replace: true });
    } catch (err) {
      setData(null);
      showErrorToast(getErrorMessage(err, '사용자를 찾지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await revokeTransaction(panel.transaction.id);
      setPanel(null);
      setData(await loadUser(data.user.uuid));
    } catch (err) {
      setPanel(null);
      showErrorToast(getErrorMessage(err, '회수하지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  const user = data?.user;
  const transactions = data?.transactions.content ?? [];
  const social = user?.socialAccount ? findSocialProvider(user.socialAccount.provider)?.name ?? user.socialAccount.provider : null;
  const joined = user ? parseLocal(user.createdAt) : null;

  return (
    <div className="page admin-page">
      <header className="page__header">
        <h1 className="page__title">사용자 조회</h1>
        <p className="page__subtitle">UUID로 사용자를 찾아 포인트 내역과 출석 적립을 확인해요</p>
      </header>

      <form
        className="admin-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          lookup();
        }}
      >
        <Input aria-label="사용자 UUID" iconLeft={searchIcon} placeholder="사용자 UUID" value={uuid} onChange={(event) => setUuid(event.target.value)} className="admin-toolbar__grow" />
        <Button type="submit" disabled={busy || !uuid.trim()}>
          조회
        </Button>
      </form>

      {user && (
        <>
          <section className="card admin-user" aria-label="사용자 정보">
            <AvatarSlot src={user.profileImage} size="lg" />
            <div className="admin-user__info">
              <span className="admin-user__name">{user.nickname}</span>
              <span className="admin-user__meta">
                {[user.email, social && `${social} 연결`, `가입 ${joined.getFullYear()}.${formatMonthDay(joined)}`].filter(Boolean).join(' · ')}
              </span>
            </div>
            <dl className="admin-user__stats">
              <div>
                <dt>포인트</dt>
                <dd className="num">{transactions[0] ? formatPoint(transactions[0].balanceAfter) : '–'}</dd>
              </div>
              <div>
                <dt>출석</dt>
                <dd className="num">{data.attendanceCount}일</dd>
              </div>
              <div>
                <dt>팔로워</dt>
                <dd className="num">{user.followerCount}</dd>
              </div>
            </dl>
            <Button variant="danger" iconLeft={lockIcon} onClick={() => setPanel({ type: 'suspend' })}>
              정지하기
            </Button>
          </section>

          <section className="admin-section" aria-label="포인트 내역">
            <div className="section-header">
              <h2 className="section-header__title">포인트 내역</h2>
              <Badge>{data.transactions.totalElements}</Badge>
              <span className="section-header__hint">출석 적립은 회수할 수 있어요</span>
            </div>
            <div className="data-table admin-table admin-points">
              <div className="data-table__head">
                <span className="admin-points__date">일시</span>
                <span className="data-table__grow">내용</span>
                <span className="admin-points__amount">변동</span>
                <span className="admin-points__amount">잔액</span>
                <span className="admin-points__action" />
              </div>
              {transactions.length === 0 && <p className="page__empty admin-table__empty">포인트 내역이 없어요</p>}
              {transactions.map((item) => (
                <div key={item.id} className="data-table__row admin-table__row">
                  <span className="admin-points__date data-table__strong num">{dateTime(item.createdAt)}</span>
                  <span className="data-table__grow">{TRANSACTION_LABELS[item.type] ?? item.type}</span>
                  <span className="admin-points__amount num">
                    {item.amount > 0 ? '+' : '−'}
                    {formatPoint(Math.abs(item.amount))}
                  </span>
                  <span className="admin-points__amount num">{formatPoint(item.balanceAfter)}</span>
                  <span className="admin-points__action">
                    {item.type === 'ATTENDANCE' && (
                      <Button variant="ghost" dense iconLeft={rotateIcon} onClick={() => setPanel({ type: 'revoke', transaction: item })}>
                        회수
                      </Button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {!user && <p className="page__empty">사용자 UUID를 넣고 조회해 주세요</p>}

      {panel?.type === 'suspend' && (
        <SuspensionModal
          user={user}
          onClose={() => setPanel(null)}
          onDone={() => {
            setPanel(null);
            lookup(user.uuid);
          }}
        />
      )}
      {panel?.type === 'revoke' && (
        <Dialog
          busy={busy}
          title="출석 포인트를 회수할까요?"
          description={`${panel.transaction.amount.toLocaleString()}P와 경험치 10이 빠지고 레벨이 다시 계산돼요. 사용자에게 알림이 가요.`}
          onClose={() => setPanel(null)}
          actions={
            <>
              <Button variant="danger" disabled={busy} onClick={revoke}>
                회수하기
              </Button>
              <Button variant="neutral" onClick={() => setPanel(null)}>
                취소
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}
