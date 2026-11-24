import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { changeItemColor, changeSkinColor, equipItem, getMyAvatar, getMyItems, unequipItem } from '../api/avatar';
import { getErrorMessage } from '../api/axios';
import { AvatarPreview } from '../components/avatar/AvatarPreview';
import { ItemTile } from '../components/avatar/ItemTile';
import { Button } from '../components/ui/Button';
import { ColorSwatches } from '../components/ui/ColorField';
import { LevelBadge } from '../components/ui/LevelBadge';
import { PointBalance } from '../components/ui/PointBalance';
import { Tabs } from '../components/ui/Tabs';
import { colorKey, ITEM_SWATCHES, ITEM_TYPES, REQUIRED_TYPES, SKIN_SWATCHES } from '../utils/avatar';
import { showErrorToast } from '../utils/errorToast';
import rotateIcon from '../assets/icons/rotate-ccw.svg';
import storeIcon from '../assets/icons/store.svg';
import { LoadState } from '../components/ui/LoadState';
import { useReload } from '../hooks/useReload';

async function loadWardrobe() {
  const [avatar, items] = await Promise.all([getMyAvatar(), getMyItems()]);
  return { avatar, items };
}

const SAVE_DELAY = 400;

// 아바타(옷장): 왼쪽 미리보기·피부색·레벨·착용 중 + 오른쪽 부위별 보유 아이템·입은 아이템 색. 누르면 바로 입고, 입은 걸 누르면 벗는다
// 색은 고르는 즉시 미리보기에 칠하고, 팔레트를 끄는 동안 요청이 몰리지 않게 멈춘 뒤에 저장한다
export function AvatarPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  // 고른 부위 탭은 주소(?type=)에 담아 새로고침해도 그대로 둔다. 기본(옷)이면 주소에서 뺀다
  const [searchParams, setSearchParams] = useSearchParams();
  const type = ITEM_TYPES.some((item) => item.value === searchParams.get('type')) ? searchParams.get('type') : 'CLOTHES';
  const setType = (value) => setSearchParams(value === 'CLOTHES' ? {} : { type: value });
  const { reloadKey, reload, loadFailed, setLoadFailed, retry } = useReload();
  const [busy, setBusy] = useState(false);
  const [draftColors, setDraftColors] = useState({}); // colorKey → '#RRGGBB', 저장 전 미리보기 색
  const saveTimers = useRef({});

  useEffect(() => {
    let ignore = false;
    loadWardrobe()
      .then((loaded) => {
        if (ignore) return;
        setData(loaded);
        // 저장이 끝난 색은 새로 받은 값으로 칠한다(아직 저장 대기 중인 색만 남김)
        setDraftColors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => saveTimers.current[key])));
      })
      .catch((err) => {
        if (ignore) return;
        setLoadFailed(true);
        showErrorToast(getErrorMessage(err, '아바타를 불러오지 못했어요.'));
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey, setLoadFailed]);

  const run = async (task, fallback) => {
    setBusy(true);
    try {
      await task();
      reload();
    } catch (err) {
      showErrorToast(getErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="page avatar-page">
        <LoadState failed={loadFailed} title="아바타를 불러오지 못했어요" onRetry={retry} />
      </div>
    );
  }

  const { avatar, items } = data;
  const { level } = avatar;
  const visible = items.filter((item) => item.type === type);
  const colorOf = (item) => draftColors[colorKey(item.type, item.itemId)] ?? item.color;
  const equippedItems = avatar.equippedItems.map((item) => ({ ...item, color: colorOf(item) }));
  const equippedHere = visible.find((item) => item.isEquipped);

  const pickColor = (key, color, save) => {
    setDraftColors((prev) => ({ ...prev, [key]: color }));
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      delete saveTimers.current[key];
      // 성공하면 다시 불러오며 지우고, 실패하면 바로 지워 저장된 색으로 되돌린다
      run(async () => {
        try {
          await save();
        } catch (err) {
          setDraftColors((prev) => Object.fromEntries(Object.entries(prev).filter(([draftKey]) => draftKey !== key)));
          throw err;
        }
      }, '색을 바꾸지 못했어요.');
    }, SAVE_DELAY);
  };
  // 몸 · 눈썹 · 눈 · 입은 벗을 수 없어서 입은 것을 다시 눌러도 그대로(다른 아이템을 누르면 바꿔 입음)
  const toggle = (item) => {
    if (item.isEquipped && REQUIRED_TYPES.includes(item.type)) return;
    run(() => (item.isEquipped ? unequipItem(item.itemId) : equipItem(item.itemId)), '아이템을 바꾸지 못했어요.');
  };
  // 기본으로 되돌리기: 기본 지급 아이템이 있는 부위는 그걸로 갈아입히고, 없는 부위는 벗는다(몸 · 눈썹 · 눈 · 입은 벗지 않음)
  const resetAll = () =>
    run(async () => {
      const starters = items.filter((item) => item.starter);
      for (const starter of starters) if (!starter.isEquipped) await equipItem(starter.itemId);
      const starterTypes = new Set(starters.map((starter) => starter.type));
      for (const worn of avatar.equippedItems) {
        if (starterTypes.has(worn.type) || REQUIRED_TYPES.includes(worn.type)) continue;
        await unequipItem(worn.itemId);
      }
    }, '기본으로 되돌리지 못했어요.');

  return (
    <div className="page avatar-page">
      <header className="page__header page__header--row">
        <h1 className="page__title">아바타</h1>
        <div className="page__header-actions">
          <PointBalance amount={avatar.point ?? 0} onAdd={() => navigate('/points')} />
          <Button variant="secondary" size="sm" iconLeft={storeIcon} onClick={() => navigate('/shop')}>
            상점 가기
          </Button>
        </div>
      </header>

      <div className="wardrobe">
        <section className="wardrobe__preview" aria-label="내 아바타">
          <AvatarPreview items={equippedItems} className="wardrobe__avatar" />
          <ColorSwatches
            label="피부색"
            colors={SKIN_SWATCHES}
            value={draftColors.skin ?? avatar.skinColor}
            onChange={(color) => pickColor('skin', color, () => changeSkinColor(color))}
            withPicker
          />
          <LevelBadge type="progress" level={level.level} currentExp={level.currentExp} requiredExp={level.requiredExp} />
          <div className="wardrobe__equipped">
            <span className="wardrobe__label">착용 중</span>
            {avatar.equippedItems.length === 0 ? (
              <p className="wardrobe__none">아직 입은 아이템이 없어요</p>
            ) : (
              <div className="wardrobe__chips">
                {avatar.equippedItems.map((item) => (
                  <span key={item.itemId} className="wardrobe__chip">
                    {item.name}
                    {/* 몸 · 눈썹 · 눈 · 입은 벗을 수 없어 × 없음 */}
                    {!REQUIRED_TYPES.includes(item.type) && (
                      <button type="button" aria-label={`${item.name} 벗기`} disabled={busy} onClick={() => run(() => unequipItem(item.itemId), '벗지 못했어요.')}>
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" iconLeft={rotateIcon} disabled={busy || avatar.equippedItems.length === 0} onClick={resetAll}>
            기본으로 되돌리기
          </Button>
        </section>

        <section className="wardrobe__inventory" aria-label="보유 아이템">
          <Tabs
            items={ITEM_TYPES.map((item) => ({ ...item, count: items.filter((owned) => owned.type === item.value).length }))}
            value={type}
            onChange={setType}
            label="부위"
          />
          <p className="wardrobe__hint">누르면 바로 착용돼요. 같은 부위는 하나만 입을 수 있어요</p>
          {equippedHere && (
            <ColorSwatches
              label={type === 'BODY' ? '피부색' : type.startsWith('HAIR_') ? '머리색 (앞머리·뒷머리 같이)' : `${equippedHere.name} 색`}
              colors={type === 'BODY' ? SKIN_SWATCHES : ITEM_SWATCHES}
              value={colorOf(equippedHere)}
              onChange={(color) =>
                pickColor(colorKey(equippedHere.type, equippedHere.itemId), color, () => changeItemColor(equippedHere.itemId, color))
              }
              withPicker
            />
          )}
          {visible.length === 0 ? (
            <div className="empty-state empty-state--card">
              <p className="empty-state__title">이 부위 아이템이 없어요</p>
              <Button variant="secondary" size="sm" onClick={() => navigate('/shop')}>
                상점에서 보기
              </Button>
            </div>
          ) : (
            <div className="item-grid">
              {visible.map((item) => (
                <ItemTile
                  key={item.itemId}
                  name={item.name}
                  imageUrl={item.imageUrl}
                  color={colorOf(item)}
                  owned
                  equipped={item.isEquipped}
                  onClick={() => !busy && toggle(item)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
