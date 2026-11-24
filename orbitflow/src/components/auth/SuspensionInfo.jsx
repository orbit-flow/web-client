// 서버 LocalDateTime("2026-11-04T21:00:00")은 시간대 없는 서울 시각이라 Date로 바꾸지 않고 글자를 그대로 나눈다
function parseLocalDateTime(value) {
  const [date, time = '00:00'] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return { year, month, day, hour, minute };
}

function formatDate({ year, month, day }) {
  return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
}

function daysBetween(from, to) {
  return Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86400000);
}

// "11월 4일 오후 9시", 분이 있으면 "오후 9시 30분"
function formatReleaseTime({ month, day, hour, minute }) {
  const period = hour < 12 ? '오전' : '오후';
  const hour12 = hour % 12 || 12;
  return `${month}월 ${day}일 ${period} ${hour12}시${minute ? ` ${minute}분` : ''}`;
}

// 사유·기간·해제 예정. expiresAt이 없으면 영구 정지
export function SuspensionInfo({ reason, suspendedAt, expiresAt }) {
  const start = parseLocalDateTime(suspendedAt);
  const end = expiresAt ? parseLocalDateTime(expiresAt) : null;

  return (
    <dl className="suspension-info">
      <div className="suspension-info__row">
        <dt>사유</dt>
        <dd className="suspension-info__reason">{reason}</dd>
      </div>
      <div className="suspension-info__row">
        <dt>기간</dt>
        <dd>
          {end
            ? `${formatDate(start)} ~ ${formatDate(end)} (${daysBetween(start, end)}일)`
            : `${formatDate(start)} ~ 영구 정지`}
        </dd>
      </div>
      <div className="suspension-info__row">
        <dt>해제 예정</dt>
        <dd>{end ? formatReleaseTime(end) : '해제되지 않아요'}</dd>
      </div>
    </dl>
  );
}
