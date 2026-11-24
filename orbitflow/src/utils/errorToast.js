// 화면 위 빨간 오류 토스트. 서버 요청이 실패했을 때 어디서든 showErrorToast('문구')
// 실제로 그리는 건 App 맨 위에 하나 붙인 ErrorToaster(로그인 전·관리자 화면에서도 뜨게 React 밖에 둔다)
const listeners = new Set();
// 첫 화면이 열리자마자 띄운 문구(예: /login?error=…)는 토스터가 아직 붙기 전이라 모아 뒀다가 붙을 때 띄운다
const pending = [];

export function showErrorToast(message) {
  if (!message) return;
  if (listeners.size === 0) {
    pending.push(message);
    return;
  }
  listeners.forEach((listener) => listener(message));
}

export function subscribeErrorToast(listener) {
  listeners.add(listener);
  pending.splice(0).forEach(listener);
  return () => listeners.delete(listener);
}
