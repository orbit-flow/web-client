import { useId } from 'react';
import classNames from 'classnames';
import { shadeRamp } from '../../utils/color';
import { LAYER_ORDER } from '../../utils/avatar';
import userPlaceholderIcon from '../../assets/icons/user-placeholder-xl.svg';

// 회색 명암 이미지를 밝기별로 색 단계(shadeRamp)로 바꿔 칠한다(50% 회색 808080 = 고른 색 그대로).
// 위에 색 판을 얹지 않고 픽셀 색 자체를 바꾸므로 그림자·광택이 탁해지지 않고, 투명한 곳·다른 레이어에는 영향이 없다
// color: '#' 있든 없든 6자리 hex, 없으면 회색 그대로
export function TintedImage({ src, color, className }) {
  const filterId = `tint-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const ramp = shadeRamp(color);
  const table = (channel) => ramp.map((rgb) => rgb[channel].toFixed(4)).join(' ');

  return (
    <span className={classNames('tinted-image', className)}>
      {ramp && (
        // 색은 sRGB 값 그대로 바꾼다(기본 linearRGB면 808080이 고른 색과 어긋남)
        <svg className="tinted-image__filter" aria-hidden="true" focusable="false">
          <filter id={filterId} colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="table" tableValues={table(0)} />
              <feFuncG type="table" tableValues={table(1)} />
              <feFuncB type="table" tableValues={table(2)} />
            </feComponentTransfer>
          </filter>
        </svg>
      )}
      <img src={src} alt="" style={ramp ? { filter: `url(#${filterId})` } : undefined} />
    </span>
  );
}

// 아바타 그림: 입은 아이템을 그리는 순서대로 겹친다. 아무것도 없으면 자리표시
// items: EquippedItem[] { type, itemId, name, imageUrl, color }
export function AvatarPreview({ items, className }) {
  const layers = [...items].sort((a, b) => LAYER_ORDER.indexOf(a.type) - LAYER_ORDER.indexOf(b.type));

  return (
    <div className={classNames('avatar-preview', className)}>
      {layers.length > 0 ? (
        layers.map((item) => <TintedImage key={item.type} className="avatar-preview__layer" src={item.imageUrl} color={item.color} />)
      ) : (
        <div className="avatar-preview__empty">
          <img src={userPlaceholderIcon} alt="" />
        </div>
      )}
    </div>
  );
}
