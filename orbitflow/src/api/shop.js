import api from './axios';

// 판매 중인 아이템(owned 포함). type이 없으면 전체 → ItemResponse[]
export async function getShopItems(type) {
  const all = [];
  for (let page = 1; ; page += 1) {
    const response = await api.get('/items', { params: { type: type || undefined, page, size: 100 } });
    const data = response.data.data;
    all.push(...data.content);
    if (page >= data.totalPages) return all;
  }
}

// 구매만 하고 장착은 하지 않는다 → PurchaseResponse { itemId, name, price, balanceAfter }
export async function purchaseItem(itemId) {
  const response = await api.post(`/items/${itemId}/purchase`);
  return response.data.data;
}
