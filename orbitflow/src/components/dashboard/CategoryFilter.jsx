import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { GlyphButton } from '../ui/GlyphButton';
import { IconButton } from '../ui/IconButton';
import { Tag } from '../ui/Tag';
import { MOBILE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { categoryColor } from '../../utils/todo';
import rotateIcon from '../../assets/icons/rotate-ccw.svg';
import settingsButtonIcon from '../../assets/icons/settings-button.svg';

// 카테고리 여러 개 골라 보기(아무것도 안 고르면 전체). 톱니 = 카테고리 관리로(onManage가 없으면 내 카테고리 화면)
// 줄은 "카테고리" 글자 | 칩들 | 톱니. 칩이 넘치면 칩 칸만 옆으로 끌어서 넘긴다(손가락은 그대로 밀기, 마우스는 끌기) — 글자 · 톱니는 제자리
export function CategoryFilter({ categories, selectedIds, onToggle, onReset, onManage }) {
  const navigate = useNavigate();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const manage = onManage ?? (() => navigate('/todos'));
  const tagsRef = useRef(null);
  const drag = useRef(null); // { x, left, moved }

  // 하나씩 골라 결국 모든 카테고리를 고르게 되면 "전체"와 같으므로 필터를 푼다
  const toggle = (id) => {
    const selectsLast = !selectedIds.includes(id) && categories.every((category) => category.id === id || selectedIds.includes(category.id));
    if (selectsLast) onReset();
    else onToggle(id);
  };

  // 마우스로 끌어 넘기기. 조금이라도 끌었으면 손을 뗄 때 칩이 눌리지 않게 한 번 막는다
  const startDrag = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag.current = { x: event.clientX, left: tagsRef.current.scrollLeft, moved: false };
  };
  const moveDrag = (event) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    tagsRef.current.scrollLeft = drag.current.left - dx;
  };
  const endDrag = () => {
    if (drag.current?.moved) {
      const block = (event) => {
        event.stopPropagation();
        event.preventDefault();
      };
      tagsRef.current.addEventListener('click', block, { capture: true, once: true });
      setTimeout(() => tagsRef.current?.removeEventListener('click', block, { capture: true }), 0);
    }
    drag.current = null;
  };

  return (
    <div className="category-filter">
      <span className="category-filter__label">카테고리</span>
      <span className="category-filter__divider" aria-hidden="true" />
      <div
        ref={tagsRef}
        className="category-filter__tags"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {categories.map((category) => (
          <Tag
            key={category.id}
            size="lg"
            color={categoryColor(category.color)}
            selected={selectedIds.includes(category.id)}
            onClick={() => toggle(category.id)}
          >
            {category.name}
          </Tag>
        ))}
      </div>
      {/* 모바일은 칩 칸이 좁아 글자 없이 아이콘만 */}
      {selectedIds.length > 0 &&
        (isMobile ? (
          <GlyphButton icon={rotateIcon} label="필터 초기화" onClick={onReset} />
        ) : (
          <Button variant="ghost" size="md" iconLeft={rotateIcon} onClick={onReset}>
            필터 초기화
          </Button>
        ))}
      <IconButton icon={settingsButtonIcon} label="카테고리 관리" onClick={manage} />
    </div>
  );
}
