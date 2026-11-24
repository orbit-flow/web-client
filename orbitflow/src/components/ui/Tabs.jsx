import { useLayoutEffect, useRef } from 'react';
import classNames from 'classnames';

// items: [{ value, label, count? }]. 선택 항목은 굵게 + 아래 2px 선(고른 탭으로 미끄러져 간다)
export function Tabs({ items, value, onChange, label }) {
  const listRef = useRef(null);

  // 고른 탭의 위치·폭을 재서 밑줄(.tabs__indicator)에 넘긴다. 글자 수(개수 배지)나 화면 폭이 바뀌어도 다시 잰다
  useLayoutEffect(() => {
    const list = listRef.current;
    const place = () => {
      const tab = list.querySelector('[aria-selected="true"]');
      list.style.setProperty('--tab-left', `${tab ? tab.offsetLeft : 0}px`);
      list.style.setProperty('--tab-width', `${tab ? tab.offsetWidth : 0}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  });

  return (
    <div ref={listRef} className="tabs" role="tablist" aria-label={label}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={classNames('tabs__item', { 'tabs__item--selected': selected })}
            onClick={() => onChange(item.value)}
          >
            {item.label}
            {item.count != null && <span className="tabs__count num">{item.count}</span>}
          </button>
        );
      })}
      <span className="tabs__indicator" aria-hidden="true" />
    </div>
  );
}
