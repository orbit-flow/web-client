import googleLogo from '../../assets/social/google.svg';
import kakaoLogo from '../../assets/social/kakao.svg';
import naverLogo from '../../assets/social/naver.svg';
import githubLogo from '../../assets/social/github.svg';

// id는 서버의 소셜 등록 ID(소문자). 응답의 Provider enum(GOOGLE 등)은 findSocialProvider로 찾는다
// disabled: 아직 쓸 수 없는 로그인(버튼은 흑백으로 보이고 눌리지 않는다) — 네이버는 검수 승인 전
export const SOCIAL_PROVIDERS = [
  { id: 'google', name: 'Google', logo: googleLogo },
  { id: 'kakao', name: '카카오', logo: kakaoLogo },
  { id: 'naver', name: '네이버', logo: naverLogo, disabled: true },
  { id: 'github', name: 'GitHub', logo: githubLogo },
];

export function findSocialProvider(provider) {
  const id = provider?.toLowerCase();
  return SOCIAL_PROVIDERS.find((item) => item.id === id) ?? null;
}
