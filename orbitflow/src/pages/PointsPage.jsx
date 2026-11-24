import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import classNames from 'classnames';
import { getMyAvatar } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import { createPayment, getPayments, getPointPackages, refundPayment } from '../api/payment';
import { attend, getAttendanceToday, getPointTransactions } from '../api/point';
import { AttendanceStrip } from '../components/dashboard/AttendanceStrip';
import { PaymentDoneModal } from '../components/point/PaymentDoneModal';
import { PaymentModal } from '../components/point/PaymentModal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { PointBalance } from '../components/ui/PointBalance';
import { Radio } from '../components/ui/Radio';
import { Tabs } from '../components/ui/Tabs';
import { formatPoint, formatWon } from '../utils/avatar';
import { addDays, formatMonthDay, isSameDay, parseLocal, startOfDay, startOfWeek, WEEKDAYS } from '../utils/date';
import { showErrorToast } from '../utils/errorToast';
import { celebrateLevelUp } from '../utils/levelUp';
import coinsIcon from '../assets/icons/coins.svg';
import { useToast } from '../hooks/useRealtime';
import { LoadState } from '../components/ui/LoadState';
import { useReload } from '../hooks/useReload';

const TRANSACTION_LABELS = {
  SIGNUP: '가입 축하 포인트',
  ATTENDANCE: '출석 체크',
  LEVEL_UP: '레벨 업 보상',
  PURCHASE: '충전',
  USE: '상점 구매',
  REFUND: '충전 환불',
  REVOKE: '출석 포인트 회수',
};

const PAYMENT_STATUS = {
  READY: { label: '결제 전', tone: 'neutral' },
  APPROVED: { label: '완료', tone: 'success' },
  FAILED: { label: '실패', tone: 'danger' },
  REFUNDED: { label: '환불', tone: 'neutral' },
};

const signed = (amount) => `${amount > 0 ? '+' : '−'}${formatPoint(Math.abs(amount))}`;

async function loadPoints() {
  const [avatar, today, transactions, packages, payments] = await Promise.all([
    getMyAvatar(),
    getAttendanceToday(),
    getPointTransactions(),
    getPointPackages(),
    getPayments(),
  ]);
  return { balance: avatar.point ?? 0, attended: today.attended, transactions: transactions.content, packages, payments: payments.content };
}

// 이번 주(월~일) 출석 칸: 출석 내역으로 지난날을 채운다
function weekDays(transactions, attendedToday) {
  const today = startOfDay(new Date());
  const monday = startOfWeek(today);
  const attendedDays = transactions.filter((item) => item.type === 'ATTENDANCE').map((item) => parseLocal(item.createdAt));
  return WEEKDAYS.map((label, index) => {
    const day = addDays(monday, index);
    const checked = attendedDays.some((date) => isSameDay(date, day)) || (isSameDay(day, today) && attendedToday);
    let state = 'upcoming';
    if (checked) state = 'checked';
    else if (isSameDay(day, today)) state = 'today';
    else if (day < today) state = 'missed';
    return { label, state };
  });
}

// 포인트: 잔액·이번 달 적립/사용 · 출석 · 충전(테스트 결제) · 포인트/결제 내역(환불)
export function PointsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  // 고른 내역 탭은 주소(?history=)에 담아 새로고침해도 그대로 둔다. 기본(포인트 내역)이면 주소에서 뺀다
  const [searchParams, setSearchParams] = useSearchParams();
  const historyTab = searchParams.get('history') === 'payments' ? 'payments' : 'points';
  const setHistoryTab = (value) => setSearchParams(value === 'payments' ? { history: value } : {});
  const [modal, setModal] = useState(null); // { type: 'pay', order } | { type: 'done', payment, method, balanceBefore } | { type: 'refund', payment }
  const { reloadKey, reload, loadFailed, setLoadFailed, retry } = useReload();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    loadPoints()
      .then((loaded) => !ignore && setData(loaded))
      .catch((err) => {
        if (ignore) return;
        setLoadFailed(true);
        showErrorToast(getErrorMessage(err, '포인트를 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey, setLoadFailed]);

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="page points-page">
        <LoadState failed={loadFailed} title="포인트를 불러오지 못했어요" onRetry={retry} />
      </div>
    );
  }

  const { balance, attended, transactions, packages, payments } = data;
  const now = new Date();
  const thisMonth = transactions.filter((item) => {
    const date = parseLocal(item.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const earned = thisMonth.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  const used = thisMonth.filter((item) => item.amount < 0).reduce((sum, item) => sum - item.amount, 0);
  const chosen = packages.find((item) => item.pointPackage === selectedPackage) ?? packages[0];

  const startCharge = () =>
    run(async () => {
      const order = await createPayment(chosen.pointPackage);
      setModal({ type: 'pay', order });
    }, '주문을 만들지 못했어요.');

  return (
    <div className="page points-page">
      <header className="page__header">
        <h1 className="page__title">포인트</h1>
        <p className="page__subtitle">출석으로 모으거나 충전해서 상점에서 써요</p>
      </header>

      <div className="points-page__top">
        <section className="card points-balance" aria-label="보유 포인트">
          <span className="points-balance__label">보유 포인트</span>
          <PointBalance amount={balance} size="lg" />
          <dl className="points-balance__month">
            <div>
              <dt>이번 달 적립</dt>
              <dd className="points-balance__plus num">+ {formatPoint(earned)}</dd>
            </div>
            <div>
              <dt>이번 달 사용</dt>
              <dd className="num">− {formatPoint(used)}</dd>
            </div>
          </dl>
        </section>

        <section className="card points-attendance" aria-label="출석 체크">
          <div className="section-header">
            <h2 className="section-header__title">출석 체크</h2>
            <span className="board-column__spacer" />
            <Button size="md" iconLeft={coinsIcon} disabled={attended || busy} onClick={() => run(async () => {
              const result = await attend();
              toast(result?.leveledUp ? `출석 완료! 500P 적립 · Lv.${result.level.level} 달성` : '출석 완료! 500P가 적립됐어요');
              if (result?.leveledUp) celebrateLevelUp(result.level.level, result.levelUpReward?.amount);
              reload();
            }, '출석하지 못했어요.')}>
              {attended ? '오늘 출석 완료' : '출석 체크 · 500P'}
            </Button>
          </div>
          <AttendanceStrip days={weekDays(transactions, attended)} />
        </section>
      </div>

      <section className="card points-charge" aria-label="포인트 충전">
        <div className="section-header">
          <h2 className="section-header__title">포인트 충전</h2>
        </div>
        <div className="points-charge__packages" role="radiogroup" aria-label="충전 상품">
          {packages.map((item) => (
            <label key={item.pointPackage} className={classNames('package-card', { 'package-card--selected': item === chosen })}>
              <Radio
                name="point-package"
                label={formatPoint(item.point)}
                checked={item === chosen}
                onChange={() => setSelectedPackage(item.pointPackage)}
              />
              <span className="package-card__price num">{formatWon(item.amount)}</span>
            </label>
          ))}
        </div>
        <div className="points-charge__footer">
          <span className="points-charge__label">결제 금액</span>
          <strong className="points-charge__total num">{chosen ? formatWon(chosen.amount) : '–'}</strong>
          <span className="board-column__spacer" />
          <Button size="md" disabled={!chosen || busy} onClick={startCharge}>
            충전하기
          </Button>
        </div>
      </section>

      <section className="points-history" aria-label="내역">
        <Tabs
          items={[
            { value: 'points', label: '포인트 내역' },
            { value: 'payments', label: '결제 내역' },
          ]}
          value={historyTab}
          onChange={setHistoryTab}
          label="내역 종류"
        />
        {historyTab === 'points' ? (
          <div className="history-list">
            {transactions.length === 0 && <p className="page__empty">아직 내역이 없어요</p>}
            {transactions.map((item) => (
              <div key={item.id} className="history-list__row">
                <span className="history-list__date num">{formatMonthDay(parseLocal(item.createdAt))}</span>
                <span className="history-list__label">{TRANSACTION_LABELS[item.type] ?? item.type}</span>
                <span className={classNames('history-list__amount num', { 'history-list__amount--plus': item.amount > 0 })}>{signed(item.amount)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="history-list">
            {payments.length === 0 && <p className="page__empty">아직 결제 내역이 없어요</p>}
            {payments.map((item) => (
              <div key={item.orderId} className="history-list__row">
                <span className="history-list__date num">{formatMonthDay(parseLocal(item.createdAt))}</span>
                <span className="history-list__label">
                  {formatPoint(item.point)} 충전 · {formatWon(item.amount)}
                </span>
                <Badge tone={PAYMENT_STATUS[item.status].tone}>{PAYMENT_STATUS[item.status].label}</Badge>
                {item.status === 'APPROVED' && (
                  <Button variant="neutral" dense disabled={busy} onClick={() => setModal({ type: 'refund', payment: item })}>
                    환불
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {modal?.type === 'pay' && (
        <PaymentModal
          order={modal.order}
          onClose={() => {
            setModal(null);
            reload();
          }}
          onPaid={(payment, method) => {
            setModal({ type: 'done', payment, method, balanceBefore: balance });
            reload();
          }}
        />
      )}
      {modal?.type === 'done' && (
        <PaymentDoneModal payment={modal.payment} method={modal.method} balanceBefore={modal.balanceBefore} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'refund' && (
        <Dialog
          busy={busy}
          title={`${formatPoint(modal.payment.point)} 충전을 환불할까요?`}
          description="충전한 포인트가 빠지고 결제가 취소돼요. 그 뒤에 상점에서 쓴 적이 있으면 환불할 수 없어요."
          onClose={() => setModal(null)}
          actions={
            <>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await refundPayment(modal.payment.orderId, '사용자 요청');
                    toast('환불했어요');
                    setModal(null);
                    reload();
                  }, '환불하지 못했어요.')
                }
              >
                환불하기
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
