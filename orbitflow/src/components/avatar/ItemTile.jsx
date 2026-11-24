import classNames from 'classnames';
import { Icon } from '../ui/Icon';
import { formatPoint } from '../../utils/avatar';
import { TintedImage } from './AvatarPreview';
import checkIcon from '../../assets/icons/check.svg';
import coinsIcon from '../../assets/icons/coins.svg';
import shirtIcon from '../../assets/icons/shirt.svg';

// 상점·옷장 아이템 칸. 아래 줄: 착용 중(파랑) · 보유 중 · 가격
// selected: 상점에서 입어 보는 중, equipped: 옷장에서 입은 것(둘 다 파란 테두리), color: 칠할 색
export function ItemTile({ name, imageUrl, color, price, owned = false, equipped = false, selected = false, onClick }) {
  let status;
  if (equipped) {
    status = (
      <span className="item-tile__status item-tile__status--equipped">
        <Icon src={checkIcon} size={14} />
        착용 중
      </span>
    );
  } else if (owned || price == null) {
    status = <span className="item-tile__status">보유 중</span>;
  } else {
    status = (
      <span className="item-tile__status item-tile__status--price num">
        <Icon src={coinsIcon} size={14} />
        {formatPoint(price)}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={classNames('item-tile', { 'item-tile--active': equipped || selected })}
      aria-pressed={equipped || selected}
      onClick={onClick}
    >
      <span className="item-tile__image">
        {imageUrl ? <TintedImage src={imageUrl} color={color} /> : <Icon src={shirtIcon} size={28} />}
      </span>
      <span className="item-tile__name">{name}</span>
      {status}
    </button>
  );
}
