import { useEffect } from 'react';
import classNames from 'classnames';

// 열린 모달 수 — 모달 위에 모달(상세 위 신고 등)이 떠도 마지막 것이 닫힐 때 페이지 스크롤을 푼다
let openCount = 0;

// 가운데 큰 창(게시글 작성·상세·신고 등). 크기·안쪽 배치는 className으로(크기를 정할 CSS 변수는 style로). 바깥을 누르거나 Esc면 onClose
// 열려 있는 동안 뒤 페이지는 스크롤하지 않는다(html.modal-open, main.css) — 모달 안 스크롤이 바깥으로 번지거나 스크롤바가 두 개 겹치지 않게
// busy면 서버에 보내는 동안 위쪽에 진행 막대가 흐른다(ui.css .progress-top)
export function Modal({ label, className, style, onClose, busy = false, children }) {
  useEffect(() => {
    openCount += 1;
    document.documentElement.classList.add('modal-open');
    return () => {
      openCount -= 1;
      if (openCount === 0) document.documentElement.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="dialog-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section
        className={classNames('modal', className, { 'progress-top': busy })}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-busy={busy || undefined}
      >
        {children}
      </section>
    </div>
  );
}
