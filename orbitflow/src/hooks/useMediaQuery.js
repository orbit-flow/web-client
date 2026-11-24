import { useSyncExternalStore } from 'react';

// layout.css의 모바일 구간(767px 이하) · 태블릿 구간(768~1023px)과 같은 값
export const MOBILE_QUERY = '(max-width: 767px)';
export const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)';

// 미디어 쿼리가 맞는지. 창 크기가 바뀌면 다시 그린다(CSS만으로 못 바꾸는 구성 — 탭 목록 등 — 에만 쓴다)
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
