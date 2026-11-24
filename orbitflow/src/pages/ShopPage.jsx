import { useEffect, useState } from 'react';
import classNames from 'classnames';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { changeItemColor, equipItem, getMyAvatar } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import { getShopItems, purchaseItem } from '../api/shop';
import { AvatarPreview } from '../components/avatar/AvatarPreview';
import { ItemTile } from '../components/avatar/ItemTile';
import { Button } from '../components/ui/Button';
import { LoadState } from '../components/ui/LoadState';
import { ColorSwatches } from '../components/ui/ColorField';
import { Dialog } from '../components/ui/Dialog';
import { GlyphButton } from '../components/ui/GlyphButton';
import { PointBalance } from '../components/ui/PointBalance';
import { Switch } from '../components/ui/Switch';
import { Tabs } from '../components/ui/Tabs';
import { formatPoint, ITEM_SWATCHES, ITEM_TYPES, itemTypeLabel, SKIN_SWATCHES, tryOn, withJosa, wornColor } from '../utils/avatar';
import { normalizeHex } from '../utils/color';
import { showErrorToast } from '../utils/errorToast';
import alertIcon from '../assets/icons/alert.svg';
import closeIcon from '../assets/icons/close.svg';
import coinsIcon from '../assets/icons/coins.svg';
import { useToast } from '../hooks/useRealtime';
import { useReload } from '../hooks/useReload';

const FILTERS = [{ value: '', label: '전체' }, ...ITEM_TYPES];

async function loadShop() {
  const [avatar, items] = await Promise.all([getMyAvatar(), getShopItems()]);
  return { avatar, items };
}

// 상점: 부위 필터 + 아이템 + 오른쪽 입어 보기(지금 입은 것에 고른 아이템을 끼워 보여 줌)
// 사면 바로 입혀 준다(구매 API는 장착하지 않아 이어서 장착). 입어 보며 색을 바꿨으면 그 색도 이어서 저장
// 목록은 아이템 기본색, 입어 보기는 입었을 때 칠해질 색(몸은 피부색, 앞머리·뒷머리는 머리색)에서 시작
export function ShopPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  // 고른 부위 탭은 주소(?type=)에 담아 새로고침해도 그대로 둔다. 기본(전체)이면 주소에서 뺀다
  const [searchParams, setSearchParams] = useSearchParams();
  const type = FILTERS.some((item) => item.value === searchParams.get('type')) ? searchParams.get('type') : '';
  const setType = (value) => setSearchParams(value ? { type: value } : {});
  const [hideOwned, setHideOwned] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [previewColor, setPreviewColor] = useState(null); // 입어 보며 고른 색('#RRGGBB'), 없으면 입었을 때 칠해질 색
  const [dialog, setDialog] = useState(null); // 'confirm' | 'short'
  const { reloadKey, reload, loadFailed, setLoadFailed, retry } = useReload();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    loadShop()
      .then((loaded) => !ignore && setData(loaded))
      .catch((err) => {
        if (ignore) return;
        setLoadFailed(true);
        showErrorToast(getErrorMessage(err, '상점을 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey, setLoadFailed]);

  if (!data) {
    return (
      <div className="page shop-page">
        <LoadState failed={loadFailed} title="상점을 불러오지 못했어요" onRetry={retry} />
      </div>
    );
  }

  const { avatar, items } = data;
  const balance = avatar.point ?? 0;
  const visible = items.filter((item) => (!type || item.type === type) && !(hideOwned && item.owned));
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const after = selected ? balance - selected.price : balance;
  const shownColor = selected ? (previewColor ?? normalizeHex(wornColor(avatar, selected))) : null;
  const select = (id) => {
    setSelectedId(id);
    setPreviewColor(null);
  };

  const buy = async () => {
    setBusy(true);
    try {
      await purchaseItem(selected.id);
      await equipItem(selected.id).catch(() => {});
      if (previewColor) await changeItemColor(selected.id, previewColor).catch(() => {});
      toast(`${withJosa(selected.name, '을', '를')} 사서 입었어요`);
      setDialog(null);
      reload();
    } catch (err) {
      setDialog(null);
      showErrorToast(getErrorMessage(err, '구매하지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page shop-page">
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">상점</h1>
          <p className="page__subtitle">포인트로 아바타 아이템을 사요</p>
        </div>
        <PointBalance amount={balance} onAdd={() => navigate('/points')} />
      </header>

      <div className="shop">
        <section className="shop__catalog" aria-label="아이템">
          <Tabs items={FILTERS} value={type} onChange={setType} label="부위" />
          <div className="shop__options">
            <span className="shop__count">
              {type ? itemTypeLabel(type) : '전체'} {visible.length}개
            </span>
            <Switch label="보유한 아이템 숨기기" checked={hideOwned} onChange={(event) => setHideOwned(event.target.checked)} />
          </div>
          {visible.length === 0 ? (
            <p className="page__empty shop__empty">해당하는 아이템이 없어요.</p>
          ) : (
            <div className="item-grid item-grid--shop">
              {visible.map((item) => (
                <ItemTile
                  key={item.id}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  color={item.defaultColor}
                  price={item.price}
                  owned={item.owned}
                  selected={item.id === selectedId}
                  onClick={() => select(item.id === selectedId ? null : item.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* 모바일(하단 탭 위 시트) · 태블릿(오른쪽 패널)에서는 아이템을 골랐을 때만 뜬다(avatar.css) */}
        <aside className={classNames('card shop__try-on', { 'shop__try-on--open': selected })} aria-label="입어 보기">
          <div className="section-header">
            <h2 className="section-header__title shop__try-title">입어 보기</h2>
            <span className="section-header__hint">{selected ? selected.name : '아이템을 고르면 입혀 봐요'}</span>
            <GlyphButton icon={closeIcon} label="입어 보기 닫기" className="shop__try-close" onClick={() => select(null)} />
          </div>
          <AvatarPreview items={tryOn(avatar.equippedItems, selected, shownColor)} className="shop__avatar" />
          {selected && !selected.owned && (
            <>
              <ColorSwatches
                label="색 미리보기"
                colors={selected.type === 'BODY' ? SKIN_SWATCHES : ITEM_SWATCHES}
                value={shownColor}
                onChange={setPreviewColor}
                withPicker
              />
              <div className="shop__price-row">
                <span>가격</span>
                <strong className="num">{formatPoint(selected.price)}</strong>
              </div>
              <div className="shop__after-row">
                <span>구매 후 남는 포인트</span>
                <strong className={after < 0 ? 'shop__short num' : 'num'}>{formatPoint(after)}</strong>
              </div>
            </>
          )}
          <Button
            fullWidth
            disabled={!selected || selected.owned}
            onClick={() => setDialog(after < 0 ? 'short' : 'confirm')}
          >
            {selected?.owned ? '이미 보유했어요' : '구매하기'}
          </Button>
        </aside>
      </div>

      {dialog === 'confirm' && selected && (
        <Dialog
          busy={busy}
          compact
          icon={coinsIcon}
          title={`${withJosa(selected.name, '을', '를')} 살까요?`}
          description={`${formatPoint(selected.price)}가 차감되고 바로 착용돼요. 구매 후 남는 포인트는 ${formatPoint(after)}예요.`}
          onClose={() => setDialog(null)}
          actions={
            <>
              <Button variant="neutral" onClick={() => setDialog(null)}>
                취소
              </Button>
              <Button disabled={busy} onClick={buy}>
                구매하기
              </Button>
            </>
          }
        />
      )}
      {dialog === 'short' && selected && (
        <Dialog
          busy={busy}
          compact
          icon={alertIcon}
          iconTone="danger"
          title="포인트가 부족해요"
          description={`${withJosa(selected.name, '은', '는')} ${formatPoint(selected.price)}예요. ${formatPoint(-after)}가 더 필요해요.`}
          onClose={() => setDialog(null)}
          actions={
            <>
              <Button variant="neutral" onClick={() => setDialog(null)}>
                닫기
              </Button>
              <Button onClick={() => navigate('/points')}>포인트 충전하기</Button>
            </>
          }
        />
      )}
    </div>
  );
}
