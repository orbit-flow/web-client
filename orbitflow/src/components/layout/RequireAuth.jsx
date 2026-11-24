import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../../api/token';

// 로그인이 필요한 화면. 토큰이 없으면 로그인으로(만료된 토큰은 첫 API 호출에서 재발급된다)
export function RequireAuth({ children }) {
  const location = useLocation();
  if (!getAccessToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}
