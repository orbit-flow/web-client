import classNames from 'classnames';

// options: [{ value, label }]. 바탕 위에 선택 항목만 카드처럼 띄운다(높이 52)
// 칸 폭을 모두 같게 두고, 선택 카드(thumb) 하나가 고른 칸으로 미끄러져 간다
export function SegmentedControl({ options, value, onChange, label, fullWidth = false }) {
  const index = options.findIndex((option) => option.value === value);

  return (
    <div
      className={classNames('segmented', { 'segmented--full': fullWidth })}
      role="radiogroup"
      aria-label={label}
      style={{ '--segmented-count': options.length, '--segmented-index': Math.max(index, 0) }}
    >
      {index >= 0 && <span className="segmented__thumb" aria-hidden="true" />}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={classNames('segmented__item', { 'segmented__item--selected': selected })}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
