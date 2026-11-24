// access token 보관. axios 요청 인터셉터와 로그인·재발급이 같은 키를 쓴다
const ACCESS_TOKEN_KEY = 'token';
// 토큰이 바뀌면 알린다(실시간 연결이 새 토큰으로 다시 붙는다)
export const TOKEN_CHANGED_EVENT = 'orbitflow:token-changed';

const notifyTokenChanged = () => window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

// access token은 본문이 아니라 Authorization 응답 헤더로 온다(Bearer 접두어 없음)
export function saveAccessToken(response) {
  const token = response.headers.authorization;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    notifyTokenChanged();
  }
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  notifyTokenChanged();
}
