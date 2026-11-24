import { useSearchParams } from 'react-router-dom';
import { ProfileSetupPage } from './ProfileSetupPage';
import { SocialSignupPage } from './SocialSignupPage';

// /onboarding 하나에 두 화면: 서버가 소셜 첫 가입을 ?ticket= 으로 보내고, 이메일 가입 직후는 티켓 없이 온다
export function OnboardingPage() {
  const [searchParams] = useSearchParams();
  const ticket = searchParams.get('ticket');

  return ticket ? <SocialSignupPage key={ticket} ticket={ticket} /> : <ProfileSetupPage />;
}
