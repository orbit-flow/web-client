import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { createItem, getAdminItems, setItemOnSale, updateItem } from '../../api/admin';
import { getErrorMessage } from '../../api/axios';
import { TintedImage } from '../../components/avatar/AvatarPreview';
import { ItemTile } from '../../components/avatar/ItemTile';
import { Button } from '../../components/ui/Button';
import { ColorField } from '../../components/ui/ColorField';
import { Icon } from '../../components/ui/Icon';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Switch } from '../../components/ui/Switch';
import { formatPoint, ITEM_TYPES, itemTypeLabel } from '../../utils/avatar';
import { normalizeHex } from '../../utils/color';
import { showErrorToast } from '../../utils/errorToast';
import imageIcon from '../../assets/icons/image.svg';
import plusIcon from '../../assets/icons/plus.svg';
import { useReload } from '../../hooks/useReload';

// 관리자 · 아이템: 목록(판매 켜기·끄기) + 오른쪽 등록·수정
export function AdminItemsPage() {
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // { item? } — item 없으면 새로 등록
  const { reloadKey, reload } = useReload();

  useEffect(() => {
    let ignore = false;
    getAdminItems()
      .then((list) => !ignore && setItems(list))
      .catch((err) => !ignore && showErrorToast(getErrorMessage(err, '아이템을 불러오지 못했어요.')));
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const toggleSale = async (item) => {
    try {
      const updated = await setItemOnSale(item.id, !item.isOnSale);
      setItems((prev) => prev.map((current) => (current.id === item.id ? updated : current)));
    } catch (err) {
      showErrorToast(getErrorMessage(err, '판매 상태를 바꾸지 못했어요.'));
    }
  };

  const current = editing ?? (items?.[0] ? { item: items[0] } : null);

  return (
    <div className="page admin-page">
      <header className="page__header page__header--row">
        <div>
          <h1 className="page__title">아이템</h1>
          <p className="page__subtitle">상점에 파는 아이템을 등록하고 판매를 켜고 꺼요</p>
        </div>
        <Button iconLeft={plusIcon} onClick={() => setEditing({})}>
          아이템 등록
        </Button>
      </header>

      <div className="admin-columns admin-columns--top">
        <div className="data-table admin-table admin-items">
          <div className="data-table__head">
            <span className="admin-items__thumb" />
            <span className="data-table__grow">이름</span>
            <span className="admin-items__type">부위</span>
            <span className="admin-items__price">가격</span>
            <span className="admin-items__sale">판매</span>
          </div>
          {items && items.length === 0 && <p className="page__empty admin-table__empty">등록한 아이템이 없어요</p>}
          {items?.map((item) => (
            <div
              key={item.id}
              className={classNames('data-table__row admin-table__row', { 'admin-table__row--selected': current?.item?.id === item.id })}
              onClick={() => setEditing({ item })}
            >
              <span className="admin-items__thumb">
                {item.imageUrl ? <TintedImage src={item.imageUrl} color={item.defaultColor} /> : <Icon src={imageIcon} size={16} />}
              </span>
              <span className="data-table__grow data-table__strong admin-items__name">
                {item.name}
                {item.starter && <Badge tone="accent">기본 지급</Badge>}
              </span>
              <span className="admin-items__type">{itemTypeLabel(item.type)}</span>
              <span className="admin-items__price num">{formatPoint(item.price)}</span>
              <span className="admin-items__sale" onClick={(event) => event.stopPropagation()}>
                <Switch aria-label={`${item.name} 판매`} checked={item.isOnSale} onChange={() => toggleSale(item)} />
              </span>
            </div>
          ))}
        </div>

        {current && (
          <ItemEditor
            key={current.item?.id ?? 'new'}
            item={current.item}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </div>
    </div>
  );
}

// 등록·수정 칸. 등록은 이미지 필수, 수정은 이미지를 바꾸지 않으면 그대로
// 이미지는 회색 명암(기본 면 808080), 기본 색은 상점 목록과 색을 고르지 않은 보유자에게 칠하는 색
function ItemEditor({ item, onCancel, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: item?.name ?? '',
    type: item?.type ?? 'CLOTHES',
    price: item ? String(item.price) : '',
    defaultColor: item ? `#${item.defaultColor}` : '#3D78F5',
    starter: item?.starter ?? false,
  }));
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const preview = useMemo(() => (image ? URL.createObjectURL(image) : item?.imageUrl), [image, item]);

  useEffect(() => () => image && URL.revokeObjectURL(preview), [image, preview]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    const price = Number(form.price);
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = '이름을 입력해 주세요';
    if (form.price === '' || !Number.isInteger(price) || price < 0) nextErrors.price = '0 이상의 정수로 입력해 주세요';
    if (!item && !image) nextErrors.image = '이미지를 골라 주세요';
    const defaultColor = normalizeHex(form.defaultColor);
    if (!defaultColor) nextErrors.defaultColor = '#RRGGBB 형식으로 입력해 주세요';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setBusy(true);
    try {
      const fields = { name: form.name.trim(), type: form.type, price, defaultColor: defaultColor.slice(1), starter: form.starter };
      if (item) await updateItem(item.id, fields, image);
      else await createItem(fields, image);
      onSaved();
    } catch (err) {
      showErrorToast(getErrorMessage(err, '아이템을 저장하지 못했어요.'));
      setBusy(false);
    }
  };

  return (
    <form className="card admin-detail" onSubmit={save}>
      <div className="section-header">
        <h2 className="section-header__title">{item ? '아이템 수정' : '아이템 등록'}</h2>
        {item && <span className="section-header__hint">{item.name}</span>}
      </div>
      <div className="admin-item-preview">
        <div className="admin-item-preview__tile">
          <ItemTile name={form.name || '이름'} imageUrl={preview} color={form.defaultColor} price={Number(form.price) || 0} />
        </div>
        <div className="admin-item-preview__upload">
          <Button variant="secondary" dense iconLeft={imageIcon} onClick={() => fileRef.current?.click()}>
            {item ? '이미지 교체' : '이미지 고르기'}
          </Button>
          <span className={errors.image ? 'field__hint field__hint--error' : 'field__hint'}>{errors.image ?? 'PNG 투명 배경 · 512×512 · 회색 명암(기본 면 808080)'}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) setImage(file);
            }}
          />
        </div>
      </div>
      <Input label="이름" value={form.name} maxLength={50} error={errors.name} onChange={set('name')} />
      <Select label="부위" value={form.type} options={ITEM_TYPES} onChange={set('type')} />
      <Input label="가격 (P)" type="number" min={0} value={form.price} error={errors.price} onChange={set('price')} />
      <ColorField
        label="기본 색 (HEX)"
        value={form.defaultColor}
        error={errors.defaultColor}
        hint="상점 목록에 보이는 색이에요. 몸은 피부색, 앞머리·뒷머리는 머리색으로 입혀져요"
        onChange={(defaultColor) => setForm((prev) => ({ ...prev, defaultColor }))}
      />
      <div className="admin-item-starter">
        <Switch
          label="기본 지급"
          checked={form.starter}
          onChange={(event) => setForm((prev) => ({ ...prev, starter: event.target.checked }))}
        />
        <p className="field__hint">
          가입한 모두에게 주고, 그 부위가 비어 있으면 입혀요. 상점에는 나오지 않아요. 부위마다 하나라서 켜면 같은 부위의 이전 기본 지급은 꺼져요(이미 받은 사람은 그대로)
        </p>
      </div>
      {item && <p className="field__hint">부위를 바꾸면 이 아이템을 입고 있던 사용자에게서 벗겨져요(보유는 그대로)</p>}
      <div className="modal__actions">
        <Button variant="neutral" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" disabled={busy}>
          {item ? '저장' : '등록'}
        </Button>
      </div>
    </form>
  );
}
