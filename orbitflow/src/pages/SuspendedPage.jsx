import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { clearPendingOAuthProvider, getSuspensionNotice } from '../api/auth';
import { getErrorMessage } from '../api/axios';
import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { AuthTitle } from '../components/auth/AuthTitle';
import { SuspensionInfo } from '../components/auth/SuspensionInfo';
import { Button } from '../components/ui/Button';
import { showErrorToast } from '../utils/errorToast';

// 두 경로로 들어온다
// - 이메일 로그인: 응답의 suspension을 state { suspension }으로
// - 소셜 로그인: 서버가 /suspended?ticket=... 으로 보냄 → 조회 키로 GET /api/auth/suspension-notice (10분 유효)
export function SuspendedPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const ticket = searchParams.get('ticket');

  const [suspension, setSuspension] = useState(state?.suspension ?? null);

  useEffect(() => {
    if (!ticket) return;
    let ignore = false;
    clearPendingOAuthProvider();
    getSuspensionNotice(ticket)
      .then((notice) => {
        if (!ignore) setSuspension(notice);
      })
      .catch((err) => {
        if (!ignore) showErrorToast(getErrorMessage(err, '정지 정보를 불러오지 못했어요. 다시 로그인해 주세요.'));
      });
    return () => {
      ignore = true;
    };
  }, [ticket]);

  if (!ticket && !state?.suspension) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthModal>
      <AuthModalHeader />
      <AuthTitle
        title="이용이 정지된 계정이에요"
        description="커뮤니티 가이드를 위반해 일정 기간 서비스를 이용할 수 없어요."
      />

      {suspension && <SuspensionInfo {...suspension} />}

      <Button size="lg" variant="neutral" fullWidth onClick={() => navigate('/login', { replace: true })}>
        확인
      </Button>

      <p className="auth-footer auth-footer--inline">
        잘못된 정지라고 생각하나요?
        <Link className="auth-footer__link auth-footer__link--accent" to="/support">
          문의하기
        </Link>
      </p>
    </AuthModal>
  );
}
