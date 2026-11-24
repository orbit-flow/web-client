import api from './axios';

const dataOf = (response) => response.data.data;

// → PointPackageResponse[] { pointPackage, amount, point } (4개)
export async function getPointPackages() {
  return dataOf(await api.get('/payments/packages'));
}

// 주문 만들기 → PaymentResponse { orderId, amount, point, status: READY }
export async function createPayment(pointPackage) {
  return dataOf(await api.post('/payments', { pointPackage }));
}

// 지금 PG는 Mock이라 결제창 없이 paymentKey를 직접 만들어 승인한다(접두어 fail·timeout 등은 실패 흉내라 쓰지 않음)
export async function confirmPayment({ orderId, amount }) {
  return dataOf(await api.post('/payments/confirm', { orderId, amount, paymentKey: `test-${crypto.randomUUID()}` }));
}

export async function refundPayment(orderId, reason) {
  return dataOf(await api.post(`/payments/${orderId}/refund`, { reason }));
}

// → PageResponse<PaymentResponse> (모든 상태, 최신순)
export async function getPayments({ page = 1, size = 50 } = {}) {
  return dataOf(await api.get('/payments', { params: { page, size } }));
}
