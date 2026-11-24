import { createContext, useCallback, useContext } from 'react';

// RealtimeProvider가 채우는 값: 내 uuid, 채팅방 목록(실시간 안 읽은 수), 안 읽은 알림 수, 새 알림 구독
export const RealtimeContext = createContext(null);

export function useRealtime() {
  const value = useContext(RealtimeContext);
  if (!value) throw new Error('useRealtime은 RealtimeProvider 안에서만 쓸 수 있어요');
  return value;
}

// 작업이 끝났을 때 잠깐 띄우는 확인 토스트. toast('할 일을 저장했어요') 또는 toast({ title, body, onOpen })
export function useToast() {
  const { showToast } = useRealtime();
  // 같은 함수를 돌려줘 effect 의존성으로 써도 매번 다시 돌지 않게
  return useCallback((toast) => showToast(typeof toast === 'string' ? { title: toast } : toast), [showToast]);
}
