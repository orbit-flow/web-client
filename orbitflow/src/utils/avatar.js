// 아이템 부위(ItemType). 탭에 보이는 순서
export const ITEM_TYPES = [
  { value: 'BODY', label: '몸' },
  { value: 'HAIR_FRONT', label: '앞머리' },
  { value: 'HAIR_BACK', label: '뒷머리' },
  { value: 'EYEBROWS', label: '눈썹' },
  { value: 'EYES', label: '눈' },
  { value: 'MOUTH', label: '입' },
  { value: 'FACE_ACC', label: '얼굴 장식' },
  { value: 'HEAD_ACC', label: '머리 장식' },
  { value: 'CLOTHES', label: '옷' },
  { value: 'BODY_ACC', label: '몸 장식' },
  { value: 'BACKGROUND', label: '배경' },
  { value: 'FRAME', label: '테두리' },
];

// 겹쳐 그리는 순서(앞이 뒤, 뒤가 위). 서버 ItemType 선언 순서와 같다
// 얼굴은 입 → 눈 → 눈썹 순으로 겹친다(눈썹이 맨 위)
export const LAYER_ORDER = ['BACKGROUND', 'HAIR_BACK', 'BODY', 'CLOTHES', 'BODY_ACC', 'MOUTH', 'EYES', 'EYEBROWS', 'FACE_ACC', 'HAIR_FRONT', 'HEAD_ACC', 'FRAME'];

export const itemTypeLabel = (type) => ITEM_TYPES.find((item) => item.value === type)?.label ?? type;

// 벗을 수 없는 부위(다른 아이템으로 바꿔 입기만, 서버 규칙과 같다)
export const REQUIRED_TYPES = ['BODY', 'EYEBROWS', 'EYES', 'MOUTH'];

// 추천 색('#' 없는 6자리). 팔레트로 다른 색도 고를 수 있다
export const SKIN_SWATCHES = ['FBE3D6', 'F6D5C8', 'EBC0A4', 'D9A47F', 'B97A56', '8D5A3B', '5E3A26'];
export const ITEM_SWATCHES = ['E5484D', 'F08C00', 'F5D90A', '21B273', '3D78F5', '8C5CF5', 'ED5C8C', '4A3428', '2B2F36', 'F2F2F2'];

// 색을 같이 쓰는 묶음: 몸은 피부색, 앞머리·뒷머리는 머리색, 나머지는 아이템마다 (서버 규칙과 같다)
export function colorKey(type, itemId) {
  if (type === 'BODY') return 'skin';
  if (type === 'HAIR_FRONT' || type === 'HAIR_BACK') return 'hair';
  return `item-${itemId}`;
}

// 사서 입었을 때 칠해질 색: 몸은 피부색, 앞머리·뒷머리는 머리색, 나머지는 아이템 기본색
export function wornColor(avatar, item) {
  const key = colorKey(item.type, item.id);
  if (key === 'skin') return avatar.skinColor;
  if (key === 'hair') return avatar.hairColor;
  return item.defaultColor;
}

// 입어 보기: 지금 입은 것에서 같은 부위만 바꿔 끼운다. color는 미리 볼 색
export function tryOn(equippedItems, item, color) {
  if (!item) return equippedItems;
  return [
    ...equippedItems.filter((equipped) => equipped.type !== item.type),
    { type: item.type, itemId: item.id, name: item.name, imageUrl: item.imageUrl, color },
  ];
}

// 받침이 있으면 첫 조사, 없으면 둘째("별 머리핀을", "리본을", "비니를")
export function withJosa(word, withBatchim, withoutBatchim) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
}

export const formatPoint = (value) => `${value.toLocaleString()}P`;
export const formatWon = (value) => `₩${value.toLocaleString()}`;
