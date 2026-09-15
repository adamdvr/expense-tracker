const DARK_TEXT = 'var(--surface-0)'
const LIGHT_TEXT = 'var(--text-primary)'

// Порог относительной яркости, при котором чёрный текст контрастнее белого (WCAG 2.x).
const LUMINANCE_THRESHOLD = 0.179

/** `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA` (с `#` или без) → `[r, g, b]` в диапазоне 0–255. */
function parseHexColor(hex: string): [number, number, number] | null {
  let value = hex.trim().replace(/^#/, '')
  if (!/^([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)) {
    return null
  }
  if (value.length <= 4) {
    value = [...value].map((char) => char + char).join('')
  }
  const channel = (offset: number) => parseInt(value.slice(offset, offset + 2), 16)
  return [channel(0), channel(2), channel(4)]
}

function toLinear(channel: number): number {
  const srgb = channel / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

/** Цвет текста поверх фона произвольного HEX-цвета: тёмный на светлом, светлый на тёмном. */
export function getReadableTextColor(backgroundHex: string): string {
  const rgb = parseHexColor(backgroundHex)
  if (!rgb) {
    return LIGHT_TEXT
  }
  const [r, g, b] = rgb
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  return luminance > LUMINANCE_THRESHOLD ? DARK_TEXT : LIGHT_TEXT
}
