// 레벨 업 축하(무지개 폭죽). 출석 응답이 leveledUp이면 celebrateLevelUp(오른 레벨, 받은 보상 포인트)
// 실제로 그리는 건 App 맨 위에 하나 붙인 LevelUpCelebration
const listeners = new Set();

export function celebrateLevelUp(level, reward) {
  listeners.forEach((listener) => listener(level, reward));
}

export function subscribeLevelUp(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
