import { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { subscribeErrorToast } from '../../utils/errorToast';
import { Icon } from './Icon';
import alertIcon from '../../assets/icons/alert.svg';

const SHOW_MS = 5000;
// 사라지는 애니메이션 길이(css .error-toast--leaving의 --dur-base와 같게)
const LEAVE_MS = 200;
const MAX_TOASTS = 3;

// 화면 위 가운데 오류 토스트(빨간 배경 · 흰 글자). App 맨 위에 하나만 둔다
export function ErrorToaster() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), LEAVE_MS);
  }, []);

  useEffect(
    () =>
      subscribeErrorToast((message) => {
        idRef.current += 1;
        const id = idRef.current;
        // 같은 문구가 이미 떠 있으면 또 쌓지 않는다
        setToasts((prev) =>
          prev.some((toast) => toast.message === message && !toast.leaving)
            ? prev
            : [...prev, { id, message }].slice(-MAX_TOASTS),
        );
        setTimeout(() => dismiss(id), SHOW_MS);
      }),
    [dismiss],
  );

  if (toasts.length === 0) return null;

  return (
    <div className="error-toast-stack" role="alert" aria-live="assertive">
      {toasts.map((toast) => (
        <div key={toast.id} className={classNames('error-toast', { 'error-toast--leaving': toast.leaving })}>
          <Icon src={alertIcon} size={22} />
          <span className="error-toast__message">{toast.message}</span>
          <button type="button" className="error-toast__close" aria-label="닫기" onClick={() => dismiss(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
