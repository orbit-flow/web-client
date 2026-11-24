import { useRef, useState } from 'react';
import classNames from 'classnames';
import { Checkbox } from '../ui/Checkbox';
import { Icon } from '../ui/Icon';
import dragIcon from '../../assets/icons/drag.svg';

// 놓은 줄이 제자리로 내려앉는 시간(css .subtask--settling과 같게)
const SETTLE_MS = 200;

// 하위 할 일 목록. items: [{ id, name, done, overdue?, date? }]
// onReorder가 있으면 손잡이를 잡아 순서를 바꾼다(같은 부모 안에서만). 잡으면 그 줄이 떠오르고 나머지가 비켜서며,
// 놓으면 빈자리로 내려앉은 뒤 id 전체를 새 순서로 넘긴다
export function SubtaskList({ items, onToggle, onReorder, guideLine = false }) {
  const listRef = useRef(null);
  // drag: { id, from, to, rows, startY, dy, settling } — rows는 잡을 때 잰 줄 위치, dy는 잡은 줄이 원래 자리에서 움직인 거리
  const [drag, setDrag] = useState(null);
  // 서버가 새 순서를 돌려주기 전까지(items의 순서가 놓기 전 그대로인 동안) 놓은 순서를 보여준다
  const [dropped, setDropped] = useState(null);
  const [landedId, setLandedId] = useState(null);
  const itemsKey = items.map((item) => item.id).join();
  const ordered =
    dropped?.baseKey === itemsKey ? dropped.ids.map((id) => items.find((item) => item.id === id)) : items;

  // 잡은 줄의 가운데가 다른 줄의 가운데에 닿거나 지나가면 그 줄과 자리를 바꾼다(끝까지 끌면 맨 위·맨 아래 자리)
  const targetIndex = (rows, from, dy) => {
    const center = rows[from].top + rows[from].height / 2 + dy;
    const middle = (row) => row.top + row.height / 2;
    const passedUp = rows.filter((row, index) => index < from && middle(row) >= center).length;
    const passedDown = rows.filter((row, index) => index > from && middle(row) <= center).length;
    return from - passedUp + passedDown;
  };

  // from → to로 옮길 때 index 줄이 비켜설 거리
  const shiftOf = (index, { rows, from, to }) => {
    const step = rows[from].step;
    if (from < to && index > from && index <= to) return -step;
    if (to < from && index >= to && index < from) return step;
    return 0;
  };

  // 잡은 줄이 to 자리에 내려앉을 때의 거리
  const slotOffset = ({ rows, from, to }) => {
    return rows[to].top - rows[from].top + (to > from ? rows[to].height - rows[from].height : 0);
  };

  const startDrag = (event, index) => {
    if (drag) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const elements = [...listRef.current.children];
    const rects = elements.map((element) => element.getBoundingClientRect());
    const rows = rects.map((rect, i) => ({
      top: rect.top,
      height: rect.height,
      // 줄 높이 + 줄 사이 간격
      step: rect.height + (rects[i + 1] ? rects[i + 1].top - rect.bottom : i > 0 ? rect.top - rects[i - 1].bottom : 0),
    }));
    setDrag({ id: ordered[index].id, from: index, to: index, rows, startY: event.clientY, dy: 0, settling: false });
  };

  const moveDrag = (event) => {
    if (!drag || drag.settling) return;
    const { rows } = drag;
    const last = rows.length - 1;
    // 목록 위아래 끝을 넘어가지 않게
    const min = rows[0].top - rows[drag.from].top;
    const max = rows[last].top + rows[last].height - (rows[drag.from].top + rows[drag.from].height);
    const dy = Math.min(max, Math.max(min, event.clientY - drag.startY));
    setDrag({ ...drag, dy, to: targetIndex(rows, drag.from, dy) });
  };

  const endDrag = () => {
    if (!drag || drag.settling) return;
    const { from, to } = drag;
    setDrag({ ...drag, dy: slotOffset(drag), settling: true });
    setTimeout(() => {
      if (from !== to) {
        const ids = ordered.map((item) => item.id);
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);
        setDropped({ baseKey: itemsKey, ids });
        onReorder(ids);
      }
      setLandedId(drag.id);
      setDrag(null);
    }, SETTLE_MS);
  };

  const rowStyle = (item, index) => {
    if (!drag) return undefined;
    const y = item.id === drag.id ? drag.dy : shiftOf(index, drag);
    return y ? { translate: `0 ${y}px` } : undefined;
  };

  return (
    <ul ref={listRef} className={classNames('subtasks', { 'subtasks--guide': guideLine, 'subtasks--sorting': drag })}>
      {ordered.map((item, index) => (
        <li
          key={item.id}
          className={classNames('subtask', {
            'subtask--done': item.done,
            'subtask--lifted': drag?.id === item.id && !drag.settling,
            'subtask--settling': drag?.id === item.id && drag.settling,
            'subtask--landed': !drag && landedId === item.id,
          })}
          style={rowStyle(item, index)}
          onAnimationEnd={() => setLandedId(null)}
        >
          <Checkbox
            checked={item.done}
            onChange={() => onToggle?.(item.id)}
            readOnly={!onToggle}
            aria-label={`${item.name} 완료`}
          />
          <span className="subtask__name">{item.name}</span>
          {item.date && (
            <span className={classNames('subtask__date num', { 'subtask__date--overdue': item.overdue && !item.done })}>
              {item.date}
            </span>
          )}
          {onReorder && items.length > 1 && (
            <span
              className="subtask__handle"
              title="끌어서 순서 바꾸기"
              onPointerDown={(event) => startDrag(event, index)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <Icon src={dragIcon} size={16} />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
