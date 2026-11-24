import api from './axios';

// → AvatarResponse { userUuid, userNickname, level: LevelResponse, point?, skinColor, hairColor, equippedItems }
// 색은 모두 '#' 없는 6자리 hex. equippedItems[].color는 서버가 정한 칠할 색(몸은 피부색, 앞머리·뒷머리는 머리색)
export async function getMyAvatar() {
  const response = await api.get('/avatars/me');
  return response.data.data;
}

// 내 uuid. 사용자 응답에는 없어 아바타에서 꺼내고, 한 번 받으면 다시 쓴다
let myUuid = null;
export function getMyUuid() {
  myUuid ??= getMyAvatar()
    .then((avatar) => avatar.userUuid)
    .catch((err) => {
      myUuid = null;
      throw err;
    });
  return myUuid;
}

// 다른 사용자의 아바타(point 없음)
export async function getUserAvatar(userUuid) {
  const response = await api.get(`/users/${userUuid}/avatar`);
  return response.data.data;
}

// 내 보유 아이템 전부(구매 최신순) → UserItemResponse[]
export async function getMyItems() {
  const all = [];
  for (let page = 1; ; page += 1) {
    const response = await api.get('/avatars/me/items', { params: { page, size: 100 } });
    const data = response.data.data;
    all.push(...data.content);
    if (page >= data.totalPages) return all;
  }
}

// 같은 부위에 끼고 있던 아이템은 서버가 자동으로 뺀다
export async function equipItem(itemId) {
  const response = await api.patch(`/avatars/me/items/${itemId}/equip`);
  return response.data.data;
}

export async function unequipItem(itemId) {
  const response = await api.patch(`/avatars/me/items/${itemId}/unequip`);
  return response.data.data;
}

// 서버는 '#' 없는 6자리로 받는다
const toApiColor = (color) => color.replace('#', '');

// 몸은 피부색, 앞머리·뒷머리는 머리색이 바뀐다(둘 다 같이) → UserItemResponse
export async function changeItemColor(itemId, color) {
  const response = await api.patch(`/avatars/me/items/${itemId}/color`, { color: toApiColor(color) });
  return response.data.data;
}

// → AvatarResponse
export async function changeSkinColor(color) {
  const response = await api.patch('/avatars/me/skin-color', { color: toApiColor(color) });
  return response.data.data;
}
