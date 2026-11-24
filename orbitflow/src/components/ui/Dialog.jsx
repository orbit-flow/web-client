import classNames from 'classnames';
import { useEffect, useId } from 'react';
import { useBlocker } from 'react-router-dom';
import { Button } from './Button';
import { Icon } from './Icon';

// 가운데 확인창(폭 400). 바깥(어두운 막)을 누르거나 Esc면 onClose
// icon이 있으면 제목 위 44px 상자(iconTone: neutral · danger), compact면 폭 360에 버튼을 반씩 나눈다
// busy면 확인한 작업을 서버에 보내는 동안 위쪽에 진행 막대가 흐른다(ui.css .progress-top)
export function Dialog({ title, description, icon, iconTone = 'neutral', compact = false, busy = false, onClose, children, actions }) {
  const titleId = useId();

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
        className={classNames('dialog', { 'dialog--compact': compact, 'progress-top': busy })}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
      >
        {icon && (
          <span className={classNames('dialog__icon', `dialog__icon--${iconTone}`)} aria-hidden="true">
            <Icon src={icon} size={22} />
          </span>
        )}
        <div className="dialog__text">
          <h2 id={titleId} className="dialog__title">
            {title}
          </h2>
          {description && <p className="dialog__desc">{description}</p>}
        </div>
        {children}
        <div className="dialog__actions">{actions}</div>
      </section>
    </div>
  );
}

// 저장 안 한 내용을 버리고 나갈지 묻는 창(화면 이동 · 같은 화면 안 다른 항목으로 바꿀 때 공통)
export function LeaveConfirmDialog({ onLeave, onStay }) {
  return (
    <Dialog
      title="작성 중이던 내용이 있어요"
      description="삭제하고 이동하시겠어요?"
      onClose={onStay}
      actions={
        <>
          <Button variant="danger" onClick={onLeave}>
            삭제하고 이동
          </Button>
          <Button variant="neutral" onClick={onStay}>
            계속 작성
          </Button>
        </>
      }
    />
  );
}

// 저장 안 한 내용(when)이 있으면 다른 화면으로 가기 전에 묻는다. 주소의 ?…만 바뀌는 이동(설정 구역 바꾸기 등)도 막는다
// 새로고침 · 탭 닫기는 브라우저가 띄우는 기본 확인 창
export function UnsavedChangesGuard({ when }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
  );

  useEffect(() => {
    if (!when) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [when]);

  if (blocker.state !== 'blocked') return null;
  return <LeaveConfirmDialog onLeave={() => blocker.proceed()} onStay={() => blocker.reset()} />;
}
