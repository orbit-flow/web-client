import classNames from 'classnames';
import { Icon } from './Icon';
import coinsIcon from '../../assets/icons/coins.svg';
import plusIcon from '../../assets/icons/plus.svg';

// 포인트 잔액. size: md 32 · lg 40. onAdd가 있으면 오른쪽에 충전(+) 버튼
export function PointBalance({ amount, size = 'md', onAdd }) {
  const large = size === 'lg';
  return (
    <div className={classNames('point-balance', `point-balance--${size}`, { 'point-balance--add': onAdd })}>
      <Icon src={coinsIcon} size={large ? 20 : 16} />
      <span className="point-balance__amount num">{amount.toLocaleString()}P</span>
      {onAdd && (
        <button type="button" className="point-balance__add" aria-label="포인트 충전" onClick={onAdd}>
          <Icon src={plusIcon} size={large ? 18 : 14} />
        </button>
      )}
    </div>
  );
}
