import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import classNames from 'classnames';
import { getReports, setReportStatus, suspendUser } from '../../api/admin';
import { getErrorMessage } from '../../api/axios';
import { SuspensionFields } from '../../components/admin/SuspensionFields';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Tag } from '../../components/ui/Tag';
import { periodBody, REPORT_STATUS, REPORT_TYPES, shortUuid } from '../../utils/admin';
import { formatMonthDay, formatTime, parseLocal } from '../../utils/date';
import { showErrorToast } from '../../utils/errorToast';
import lockIcon from '../../assets/icons/lock.svg';
import { useReload } from '../../hooks/useReload';

const STATUS_FILTERS = [{ value: '', label: '전체' }, ...Object.entries(REPORT_STATUS).map(([value, item]) => ({ value, label: item.label }))];
const TYPE_OPTIONS = [
  { value: '', label: '종류: 전체' },
  { value: 'POST', label: '종류: 게시글' },
  { value: 'COMMENT', label: '종류: 댓글' },
  { value: 'USER', label: '종류: 사용자' },
];

const fullDateTime = (value) => {
  const date = parseLocal(value);
  return `${date.getFullYear()}.${formatMonthDay(date)} ${formatTime(date)}`;
};

const targetText = (report) => (report.targetExists ? report.targetSummary : '삭제된 대상');

// 관리자 · 신고: 상태·종류로 거른 목록 + 오른쪽 상세(확인·기각, 대상 사용자 정지 → 제재)
export function AdminReportsPage() {
  const { refreshReceived } = useOutletContext();
  const [status, setStatus] = useState('RECEIVED');
  const [contentType, setContentType] = useState('');
  const [reports, setReports] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const { reloadKey, reload } = useReload();

  useEffect(() => {
    let ignore = false;
    getReports({ status, contentType })
      .then((page) => !ignore && setReports(page.content))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '신고를 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [status, contentType, reloadKey]);

  const selected = reports?.find((report) => report.id === selectedId) ?? reports?.[0] ?? null;
  const changed = () => {
    reload();
    refreshReceived();
  };

  return (
    <div className="page admin-page">
      <header className="page__header">
        <h1 className="page__title">신고</h1>
        <p className="page__subtitle">게시글 · 댓글 · 사용자 신고를 확인하고 처리해요</p>
      </header>

      <div className="admin-toolbar">
        {STATUS_FILTERS.map((item) => (
          <Tag key={item.value || 'all'} size="lg" selected={status === item.value} onClick={() => setStatus(item.value)}>
            {item.label}
          </Tag>
        ))}
        <span className="board-column__spacer" />
        <Select aria-label="신고 종류" value={contentType} options={TYPE_OPTIONS} onChange={(event) => setContentType(event.target.value)} className="admin-toolbar__select" />
      </div>

      <div className="admin-columns">
        <div className="data-table admin-table admin-reports">
          <div className="data-table__head">
            <span className="admin-reports__id">#</span>
            <span className="admin-reports__type">종류</span>
            <span className="data-table__grow">대상</span>
            <span className="admin-reports__reporter">신고자</span>
            <span className="admin-reports__date">접수일</span>
            <span className="admin-reports__status">상태</span>
          </div>
          {reports && reports.length === 0 && <p className="page__empty admin-table__empty">이 조건의 신고가 없어요</p>}
          {reports?.map((report) => (
            <button
              key={report.id}
              type="button"
              className={classNames('data-table__row admin-table__row', { 'admin-table__row--selected': report.id === selected?.id })}
              onClick={() => setSelectedId(report.id)}
            >
              <span className="admin-reports__id data-table__strong num">{report.id}</span>
              <span className="admin-reports__type">{report.contentType}</span>
              <span className="data-table__grow admin-table__ellipsis">
                {report.reason} · {targetText(report)}
              </span>
              <span className="admin-reports__reporter">{report.reporterNickname}</span>
              <span className="admin-reports__date num">{formatMonthDay(parseLocal(report.createdAt))}</span>
              <span className="admin-reports__status">
                <Badge tone={REPORT_STATUS[report.status].tone}>{REPORT_STATUS[report.status].label}</Badge>
              </span>
            </button>
          ))}
        </div>

        {selected && <ReportDetail key={selected.id} report={selected} onChanged={changed} />}
      </div>
    </div>
  );
}

// 신고 하나: 정보 + 상태 변경 + 대상 사용자 정지(접수 상태면 먼저 확인으로 바꾼 뒤 정지 → 서버가 제재로 처리)
function ReportDetail({ report, onChanged }) {
  const [period, setPeriod] = useState('7');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(null);
  const [busy, setBusy] = useState(false);
  const open = report.status === 'RECEIVED' || report.status === 'CONFIRMED';
  const canSuspend = open && report.targetUserUuid;

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
      onChanged();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const suspend = () => {
    if (!reason.trim()) {
      setReasonError('사유를 적어 주세요');
      return;
    }
    setReasonError(null);
    run(async () => {
      if (report.status === 'RECEIVED') await setReportStatus(report.id, 'CONFIRMED');
      await suspendUser({ userUuid: report.targetUserUuid, reason: reason.trim(), reportId: report.id, ...periodBody(period) });
    }, '정지하지 못했어요.');
  };

  const rows = [
    ['종류', `${report.contentType} (${REPORT_TYPES[report.contentType] ?? report.contentType})`],
    ['대상', [targetText(report), shortUuid(report.targetUserUuid)].filter(Boolean).join(' · ')],
    ['신고자', report.reporterNickname],
    ['사유', report.reason],
    ['접수', fullDateTime(report.createdAt)],
  ];

  return (
    <section className="card admin-detail" aria-label={`신고 #${report.id}`}>
      <div className="section-header">
        <h2 className="section-header__title">신고 #{report.id}</h2>
        <span className="board-column__spacer" />
        <Badge tone={REPORT_STATUS[report.status].tone}>{REPORT_STATUS[report.status].label}</Badge>
      </div>
      <dl className="admin-detail__rows">
        {rows.map(([label, value]) => (
          <div key={label} className="admin-detail__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {open && (
        <div className="admin-detail__group">
          <span className="admin-detail__label">상태 변경</span>
          <div className="admin-detail__buttons">
            {report.status === 'RECEIVED' && (
              <Button variant="secondary" disabled={busy} onClick={() => run(() => setReportStatus(report.id, 'CONFIRMED'), '상태를 바꾸지 못했어요.')}>
                확인
              </Button>
            )}
            <Button variant="neutral" disabled={busy} onClick={() => run(() => setReportStatus(report.id, 'REJECTED'), '상태를 바꾸지 못했어요.')}>
              기각
            </Button>
          </div>
          <span className="field__hint">접수 → 확인 · 기각, 확인 → 제재 · 기각</span>
        </div>
      )}

      {canSuspend && (
        <div className="admin-detail__suspend">
          <span className="admin-detail__label">정지하기</span>
          <SuspensionFields period={period} reason={reason} onPeriodChange={setPeriod} onReasonChange={setReason} reasonError={reasonError} />
          <Button variant="danger" iconLeft={lockIcon} fullWidth disabled={busy} onClick={suspend}>
            정지하고 제재로 처리
          </Button>
        </div>
      )}
    </section>
  );
}
