import { useEffect, useId } from 'react';
import classNames from 'classnames';
import { IconButton } from './IconButton';
import closeIcon from '../../assets/icons/close.svg';

// 오른쪽에서 열리는 패널(폭 480). 본문은 스크롤, 아래 footer는 고정. Esc로 닫기
// centered면 같은 내용을 화면 가운데 창(모달)으로 띄운다. 바깥을 누르면 닫힌다
// busy면 저장하는 동안 위쪽에 진행 막대가 흐른다(ui.css .progress-top)
export function Drawer({ title, onClose, children, footer, centered = false, busy = false }) {
  const titleId = useId();

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const panel = (
    <aside
      className={classNames('drawer', { 'drawer--centered': centered, 'progress-top': busy })}
      role="dialog"
      aria-modal={centered || undefined}
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
    >
      <header className="drawer__header">
        <h2 id={titleId} className="drawer__title">
          {title}
        </h2>
        <IconButton icon={closeIcon} label="닫기" onClick={onClose} />
      </header>
      <div className="drawer__body">{children}</div>
      {footer && <footer className="drawer__footer">{footer}</footer>}
    </aside>
  );

  if (!centered) return panel;
  return (
    <div className="dialog-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      {panel}
    </div>
  );
}
