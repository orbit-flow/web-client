import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { getAccessToken } from '../api/token';
import { AuthModal } from '../components/auth/AuthModal';
import { AuthModalHeader } from '../components/auth/AuthModalHeader';
import { AuthTitle } from '../components/auth/AuthTitle';
import { Button } from '../components/ui/Button';

// 없는 주소(path="*")와 라우터 오류(errorElement)를 함께 받는다
// 404면 "페이지를 찾을 수 없어요", 화면을 그리다 난 오류면 "문제가 생겼어요" + 새로고침
export function NotFoundPage() {
  const navigate = useNavigate();
  const error = useRouteError();
  const notFound = !error || (isRouteErrorResponse(error) && error.status === 404);

  // 로그인돼 있으면 대시보드, 아니면 첫 화면
  const goHome = () => navigate(getAccessToken() ? '/home' : '/', { replace: true });

  return (
    <AuthModal>
      <AuthModalHeader showClose={false} />
      {notFound ? (
        <AuthTitle title="페이지를 찾을 수 없어요" description="주소가 바뀌었거나 없어진 페이지예요." />
      ) : (
        <AuthTitle title="문제가 생겼어요" description={'화면을 불러오다 오류가 났어요.\n새로고침해도 계속되면 잠시 뒤에 다시 시도해 주세요.'} />
      )}

      {!notFound && (
        <Button size="lg" fullWidth onClick={() => window.location.reload()}>
          새로고침
        </Button>
      )}
      <Button size="lg" variant={notFound ? 'primary' : 'neutral'} fullWidth onClick={goHome}>
        홈으로
      </Button>
    </AuthModal>
  );
}
