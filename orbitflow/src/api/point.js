import api from './axios';

// 출석(하루 1회, 서울 자정 기준) → AttendanceResponse { transaction, gainedExp, leveledUp, level }
export async function attend() {
  const response = await api.post('/points/attendance');
  return response.data.data;
}

// → { date, attended }
export async function getAttendanceToday() {
  const response = await api.get('/points/attendance/today');
  return response.data.data;
}

// → PageResponse<PointTransactionResponse> (최신순)
export async function getPointTransactions({ page = 1, size = 100 } = {}) {
  const response = await api.get('/points/transactions', { params: { page, size } });
  return response.data.data;
}
