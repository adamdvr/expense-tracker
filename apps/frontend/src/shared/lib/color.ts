const DARK_TEXT = 'var(--surface-0)'
const LIGHT_TEXT = 'var(--text-primary)'

// Порог относительной яркости, при котором чёрный текст контрастнее белого (WCAG 2.x).
const LUMINANCE_THRESHOLD = 0.179

/** `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA` (с `#` или без) → `[r, g, b, a]`, `a` в диапазоне 0–1. */
function parseHexColor(hex: string): [number, number, number, number] | null {
  let value = hex.trim().replace(/^#/, '')
  if (!/^([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) {
    return null
  }
  if (value.length <= 4) {
    value = [...value].map((char) => char + char).join('')
  }
  const channel = (offset: number) => parseInt(value.slice(offset, offset + 2), 16)
  const alpha = value.length === 8 ? channel(6) / 255 : 1
  return [channel(0), channel(2), channel(4), alpha]
}

function toLinear(channel: number): number {
  const srgb = channel / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

// Значок категории (единственный сегодняшний вызывающий, transaction-row.tsx) рисуется
// внутри Card, чей фон — --card / --surface-2 (#0F131C), а не страничный --surface-0.
// Используем именно его для смешения по alpha, а не яркость ~0 «на глаз».
const UNDERLYING_SURFACE_LUMINANCE = relativeLuminance(15, 19, 28)

/** Цвет текста поверх фона произвольного HEX-цвета: тёмный на светлом, светлый на тёмном. */
export function getReadableTextColor(backgroundHex: string): string {
  const parsed = parseHexColor(backgroundHex)
  if (!parsed) {
    return LIGHT_TEXT
  }
  const [r, g, b, a] = parsed
  const luminance = relativeLuminance(r, g, b)
  // При полупрозрачности (alpha < 1) реальная воспринимаемая яркость — смесь цвета
  // категории и фона под ним, а не яркость самого цвета «как есть».
  const effectiveLuminance = luminance * a + UNDERLYING_SURFACE_LUMINANCE * (1 - a)
  return effectiveLuminance > LUMINANCE_THRESHOLD ? DARK_TEXT : LIGHT_TEXT
}
