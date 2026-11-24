import api from './axios';
import { clearAccessToken, saveAccessToken } from './token';

export { reissueToken } from './axios';

// 이메일 인증 코드는 발송 후 5분 유효. 응답의 expireTime은 시간대 없는 서버(Asia/Seoul) 시각이라 기기 시계로 센다
export const EMAIL_CODE_TTL_MS = 5 * 60 * 1000;

// → LoginResponse { suspended, suspension? }. suspended면 토큰이 없다
export async function login({ email, password }) {
  const response = await api.post('/auth/login', { email, password });
  saveAccessToken(response);
  return response.data.data;
}

// 이 기기만 로그아웃: 서버가 토큰을 막고 refresh 쿠키를 지운다. 서버가 실패해도 이 기기 토큰은 지운다
// 화면 이동은 호출 측이(실시간 연결·화면 상태를 정리하도록 /login으로 새로 연다)
export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // 서버 쪽 실패는 무시하고 이 기기에서는 로그아웃
  } finally {
    clearAccessToken();
  }
}

// 메일을 동기로 보내서 기본 timeout(5초)보다 오래 걸릴 수 있다
export async function sendEmailCode(email) {
  const response = await api.post('/auth/email/sendcode', { email }, { timeout: 15000 });
  return response.data.data;
}

// → 이메일 인증 토큰(15분 유효). 가입의 emailVerifyToken으로 보낸다
export async function verifyEmailCode({ email, code }) {
  const response = await api.post('/auth/email/verify', { email, code });
  return response.data.data.token;
}

// 가입은 토큰을 주지 않는다. 가입 후 login()을 따로 불러야 한다
export async function signup({ email, password, nickname, emailVerifyToken, termsAgreed }) {
  const response = await api.post('/users', { email, password, nickname, emailVerifyToken, termsAgreed });
  return response.data.data;
}

// sendEmailCode로 받은 코드를 그대로 보낸다(email/verify를 거치면 코드가 소모돼 해제할 수 없다). 토큰은 주지 않는다
export async function releaseDormant({ email, code }) {
  await api.post('/auth/dormant/release', { email, code });
}

// 가입 여부와 관계없이 성공한다. 메일의 링크: /reset-password?token=...
export async function sendPasswordResetMail(email) {
  await api.post('/auth/password/reset-mail', { email });
}

// 모든 기기 세션이 끊기고 토큰은 주지 않는다. 새 비밀번호로 다시 로그인
export async function resetPassword({ token, newPassword }) {
  await api.post('/auth/password/reset', { token, newPassword });
}

// 소셜 로그인은 XHR이 아니라 브라우저를 이 주소로 이동시킨다
export function getOAuthLoginUrl(provider) {
  return `/oauth2/authorization/${provider}`;
}

// → SocialSignupInfoResponse { provider, email, nickname, profileImage? }
export async function getSocialSignupInfo(ticket) {
  const response = await api.get('/auth/oauth/signup', { params: { ticket } });
  return response.data.data;
}

// 가입과 함께 로그인된다(이메일 로그인과 같은 토큰 전달)
export async function socialSignup({ ticket, nickname, termsAgreed }) {
  const response = await api.post('/auth/oauth/signup', { ticket, nickname, termsAgreed });
  saveAccessToken(response);
  return response.data.data;
}

// → SuspendedAccountResponse { reason, suspendedAt, expiresAt? }
export async function getSuspensionNotice(ticket) {
  const response = await api.get('/auth/suspension-notice', { params: { ticket } });
  return response.data.data;
}

// 소셜 로그인에 성공하면 서버는 첫 화면(/)으로만 돌려보낸다.
// 어느 제공자로 시작했는지 이 탭에 적어 두고, 돌아왔을 때 토큰 재발급(로그인 마무리) 여부를 정한다
const OAUTH_PROVIDER_KEY = 'oauthProvider';

export function rememberOAuthProvider(provider) {
  sessionStorage.setItem(OAUTH_PROVIDER_KEY, provider);
}

export function getPendingOAuthProvider() {
  return sessionStorage.getItem(OAUTH_PROVIDER_KEY);
}

export function clearPendingOAuthProvider() {
  sessionStorage.removeItem(OAUTH_PROVIDER_KEY);
}
