import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearPendingOAuthProvider, reissueToken } from '../../api/auth';
import { ProgressBar } from '../ui/ProgressBar';
import { AuthModal } from './AuthModal';
import { AuthModalHeader } from './AuthModalHeader';
import { AuthTitle } from './AuthTitle';
import { findSocialProvider } from './socialProviders';

// 소셜 로그인에서 돌아온 직후. refresh 쿠키만 있으니 재발급으로 access token을 받고 onDone
export function SocialLoginProgress({ provider, onDone }) {
  const navigate = useNavigate();
  const name = findSocialProvider(provider)?.name ?? '소셜';

  useEffect(() => {
    let ignore = false;
    reissueToken()
      .then(() => {
        if (ignore) return;
        clearPendingOAuthProvider();
        onDone();
      })
      .catch(() => {
        if (ignore) return;
        clearPendingOAuthProvider();
        navigate('/login?error=login_failed', { replace: true });
      });
    return () => {
      ignore = true;
    };
  }, [navigate, onDone]);

  return (
    <AuthModal>
      <AuthModalHeader showClose={false} />
      <AuthTitle title={`${name} 계정으로 로그인하는 중이에요`} description="잠시만 기다려 주세요. 창을 닫지 마세요." />
      <ProgressBar value={60} label="로그인 진행" />
    </AuthModal>
  );
}
