// 디자인 시스템 토큰과 같은 값: --white, --neutral-900
export const TEXT_ON_DARK = '#FFFFFF';
export const TEXT_ON_LIGHT = '#15171C';
const FALLBACK_BG = '#9CA1AB'; // --neutral-400

const HEX_RE = /^#?([0-9A-Fa-f]{6})$/;

// API는 '#' 없는 6자리 hex("FF8800")를 준다. 잘못된 값이나 "none"이면 null.
export function normalizeHex(color) {
  const match = typeof color === 'string' ? color.trim().match(HEX_RE) : null;
  return match ? `#${match[1].toUpperCase()}` : null;
}

// WCAG 2.x 상대 휘도 (0 = 검정, 1 = 흰색)
function relativeLuminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA, hexB) {
  const [hi, lo] = [relativeLuminance(hexA), relativeLuminance(hexB)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

// 배경색 위에서 대비가 더 큰 글자색을 고른다.
// 배경 휘도가 약 0.2 밑으로 내려가면 흰 글자가 된다.
export function getTextColor(background) {
  const bg = normalizeHex(background) ?? FALLBACK_BG;
  return contrastRatio(bg, TEXT_ON_DARK) >= contrastRatio(bg, TEXT_ON_LIGHT)
    ? TEXT_ON_DARK
    : TEXT_ON_LIGHT;
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

// '#RRGGBB' → [r, g, b] (0~1)
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

function rgbToHsl([r, g, b]) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}

// 아바타 아이템 색 단계: 회색 명암 이미지의 밝기 0·25·50·75·100%를 바꿔 칠할 색 5개([r, g, b] 0~1).
// 그림 전체가 쨍하지 않게 고른 색의 채도를 한 번 덜어(MUTE) 50%(808080) 자리에 칠하고, 나머지 단계는 그보다 더 낮춘다
// 그림자 · 외곽선은 어둡게 하며 채도를 낮추고, 밝은 면 · 광택은 밝게 하며 더 낮춘다
const MUTE = 0.8;

export function shadeRamp(color) {
  const hex = normalizeHex(color);
  if (!hex) return null;
  const { h, s: picked, l } = rgbToHsl(hexToRgb(hex));
  const s = picked * MUTE;
  return [
    hslToRgb({ h, s: clamp01(s * 0.55), l: l * 0.32 }), // 외곽선
    hslToRgb({ h, s: clamp01(s * 0.75), l: l * 0.7 }), // 그림자
    hslToRgb({ h, s, l }), // 기본 면(808080)
    hslToRgb({ h, s: clamp01(s * 0.65), l: l + (1 - l) * 0.45 }), // 밝은 면
    hslToRgb({ h, s: clamp01(s * 0.3), l: l + (1 - l) * 0.9 }), // 광택
  ];
}

// 카테고리 칩·태그처럼 사용자 색을 배경으로 칠할 때 쓰는 스타일
export function categoryColorStyle(color) {
  const backgroundColor = normalizeHex(color) ?? FALLBACK_BG;
  return { backgroundColor, color: getTextColor(backgroundColor) };
}
