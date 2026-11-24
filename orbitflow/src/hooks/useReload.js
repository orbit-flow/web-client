import { useCallback, useState } from 'react';

// 화면 데이터 다시 불러오기: reloadKey를 불러오는 effect의 의존성에 넣고, 바꾼 뒤 reload()로 다시 불러온다
// 불러오지 못하면 setLoadFailed(true), 실패 화면(LoadState)의 "다시 시도"는 retry() — 실패 표시를 지우고 다시 불러온다
export function useReload() {
  const [reloadKey, setReloadKey] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const retry = useCallback(() => {
    setLoadFailed(false);
    reload();
  }, [reload]);

  return { reloadKey, reload, loadFailed, setLoadFailed, retry };
}
