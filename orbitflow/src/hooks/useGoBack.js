import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// 뒤로 가기: 앱 안에서 들어왔으면 직전 화면으로, 주소로 바로 열었거나 새 탭이라 앱 안 이전 기록이 없으면 fallback으로
// (react-router가 history.state.idx에 앱 안 기록 순번을 담는다)
export function useGoBack(fallback) {
  const navigate = useNavigate();
  return useCallback(() => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(fallback);
  }, [navigate, fallback]);
}
