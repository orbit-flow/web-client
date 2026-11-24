import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';
import { IconButton } from './IconButton';
import moreIcon from '../../assets/icons/more.svg';

// 메뉴 한 줄 높이(css .menu__item min-height) + 위아래 여백·테두리 — 아래 자리가 모자라면 위로 펼칠지 정할 때 쓴다
const ITEM_HEIGHT = 44;
const LIST_CHROME = 10;
const GAP = 4;

// 더보기(…) 버튼 + 아래로 펼치는 메뉴. items: [{ label, onClick, danger? }] (빈 항목은 걸러 낸다)
// 목록은 body에 띄운다(position: fixed) — 넘침을 자르는 목록·카드·모달 안에서도 가려지지 않게
export function Menu({ label = '더보기', items }) {
  const [position, setPosition] = useState(null);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const visible = items.filter(Boolean);
  const open = position !== null;

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'mousedown' && (rootRef.current?.contains(event.target) || listRef.current?.contains(event.target))) return;
      setPosition(null);
    };
    // 화면이 움직이면 버튼과 떨어지므로 닫는다
    const closeNow = () => setPosition(null);
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    window.addEventListener('scroll', closeNow, true);
    window.addEventListener('resize', closeNow);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
      window.removeEventListener('scroll', closeNow, true);
      window.removeEventListener('resize', closeNow);
    };
  }, [open]);

  if (visible.length === 0) return null;

  const toggle = () => {
    if (open) {
      setPosition(null);
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    const height = visible.length * ITEM_HEIGHT + LIST_CHROME;
    const right = window.innerWidth - rect.right;
    // 아래 자리가 모자라고 위가 더 넉넉하면 위로
    const upward = rect.bottom + GAP + height > window.innerHeight && rect.top > window.innerHeight - rect.bottom;
    setPosition(upward ? { bottom: window.innerHeight - rect.top + GAP, right } : { top: rect.bottom + GAP, right });
  };

  return (
    <div className="menu" ref={rootRef} onClick={(event) => event.stopPropagation()}>
      <IconButton icon={moreIcon} label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle} />
      {open &&
        createPortal(
          <ul ref={listRef} className="menu__list" role="menu" style={position} onClick={(event) => event.stopPropagation()}>
            {visible.map((item) => (
              <li key={item.label} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={classNames('menu__item', { 'menu__item--danger': item.danger })}
                  onClick={() => {
                    setPosition(null);
                    item.onClick();
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
