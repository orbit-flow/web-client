import axios from 'axios';
import { clearAccessToken, getAccessToken, saveAccessToken } from './token';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
  // RefreshToken 쿠키(HttpOnly)를 주고받으려면 필요
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 같은 refresh token으로 동시에 부르면 하나만 성공하므로 진행 중인 요청을 함께 쓴다
let reissuing = null;

// RefreshToken 쿠키로 access token을 다시 받는다(쿠키도 새로 교체됨)
export function reissueToken() {
  reissuing ??= api
    .post('/auth/token-reissue')
    .then(saveAccessToken)
    .finally(() => {
      reissuing = null;
    });
  return reissuing;
}

// 로그인이 필요한 API가 401(만료·로그아웃된 토큰)이면 한 번 재발급하고 원래 요청을 다시 보낸다.
// /auth/** 는 토큰을 보지 않으므로 제외하고, 재발급도 실패하면 로그인 화면으로
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && config && !config.retried && !config.url.startsWith('/auth/')) {
      config.retried = true;
      try {
        await reissueToken();
        return api(config);
      } catch {
        clearAccessToken();
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

// 파일 업로드(multipart) 요청 설정
// - 기본 Content-Type(json)이 남아 있으면 axios가 FormData를 JSON으로 바꿔 버리므로 덮어쓴다
// - 서버가 S3에 올린 뒤 응답하므로 기본 timeout(5초)보다 길게
export const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 };

// 실패 응답의 사용자용 문구(CommonResponse.message). 없으면 fallback
export function getErrorMessage(error, fallback) {
  return error?.response?.data?.message ?? fallback;
}

export default api;
