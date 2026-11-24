import api, { MULTIPART } from './axios';

// 관리자 API(/api/admin/**, ROLE_ADMIN). 관리자가 아니면 403
const dataOf = (response) => response.data.data;

/* ───────── 신고 ───────── */

// status: RECEIVED · CONFIRMED · SANCTIONED · REJECTED, contentType: POST · COMMENT · USER → PageResponse<ReportListResponse>
export async function getReports({ status, contentType, page = 1, size = 50 } = {}) {
  return dataOf(await api.get('/admin/reports', { params: { status: status || undefined, contentType: contentType || undefined, page, size } }));
}

export async function getReport(reportId) {
  return dataOf(await api.get(`/admin/reports/${reportId}`));
}

// CONFIRMED · REJECTED만(SANCTIONED는 정지로만)
export async function setReportStatus(reportId, status) {
  return dataOf(await api.patch(`/admin/reports/${reportId}/status`, { status }));
}

/* ───────── 정지 ───────── */

// keyword: 이름·이메일 부분 일치, status: ACTIVE · RELEASED · EXPIRED → PageResponse<SuspensionListResponse>
export async function getSuspensions({ keyword, status, page = 1, size = 50 } = {}) {
  return dataOf(await api.get('/admin/suspensions', { params: { keyword: keyword || undefined, status: status || undefined, page, size } }));
}

// body: { userUuid, reason, permanent, expiresAt?, reportId? } (reportId 신고는 CONFIRMED여야 하고, 정지되면 SANCTIONED)
export async function suspendUser(body) {
  return dataOf(await api.post('/admin/suspensions', body));
}

// body: { reason, permanent, expiresAt? } — 진행 중인 정지만
export async function updateSuspension(suspensionId, body) {
  return dataOf(await api.patch(`/admin/suspensions/${suspensionId}`, body));
}

export async function releaseSuspension(suspensionId, releasedReason) {
  return dataOf(await api.patch(`/admin/suspensions/${suspensionId}/release`, { releasedReason }));
}

/* ───────── 아이템 ───────── */

// 판매 중지 포함 전부 → ItemResponse[]
export async function getAdminItems() {
  const all = [];
  for (let page = 1; ; page += 1) {
    const data = dataOf(await api.get('/admin/items', { params: { page, size: 100 } }));
    all.push(...data.content);
    if (page >= data.totalPages) return all;
  }
}

// request(JSON 파트) + image 파일. 등록은 image 필수, 수정은 없으면 기존 이미지 유지
// defaultColor: '#' 없는 6자리 hex, starter: 기본 지급(부위마다 하나 — 켜면 같은 부위의 이전 기본 지급은 꺼짐)
function itemForm({ name, type, price, defaultColor, starter }, image) {
  const form = new FormData();
  form.append('request', new Blob([JSON.stringify({ name, type, price, defaultColor, starter })], { type: 'application/json' }));
  if (image) form.append('image', image);
  return form;
}

export async function createItem(fields, image) {
  return dataOf(await api.post('/admin/items', itemForm(fields, image), MULTIPART));
}

export async function updateItem(itemId, fields, image) {
  return dataOf(await api.put(`/admin/items/${itemId}`, itemForm(fields, image), MULTIPART));
}

export async function setItemOnSale(itemId, onSale) {
  return dataOf(await api.patch(`/admin/items/${itemId}/sale`, { onSale }));
}

/* ───────── 사용자 · 포인트 ───────── */

// → AdminUserResponse (정지·휴면 포함, 상태 필드는 없음)
export async function getAdminUser(userUuid) {
  return dataOf(await api.get(`/admin/users/${userUuid}`));
}

// → PageResponse<PointTransactionResponse>. type으로 ATTENDANCE 등만 볼 수 있다
export async function getUserPointTransactions(userUuid, { type, page = 1, size = 50 } = {}) {
  return dataOf(await api.get(`/admin/users/${userUuid}/point-transactions`, { params: { type: type || undefined, page, size } }));
}

// ATTENDANCE 거래만, 한 번씩 회수 → 새 REVOKE 거래
export async function revokeTransaction(transactionId) {
  return dataOf(await api.post(`/admin/point-transactions/${transactionId}/revoke`));
}
