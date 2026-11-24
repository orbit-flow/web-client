import { useEffect, useState } from 'react';

// expiresAt(ms 타임스탬프)까지 남은 시간(ms). 1초마다 갱신하고, expiresAt이 바뀌면 바로 다시 센다
export function useCountdown(expiresAt) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [expiresAt]);

  return Math.max(0, expiresAt - now);
}
