export interface CategoryColor {
  /** HEX, в таком виде уходит на backend. */
  value: string
  /** Название цвета для скринридера. */
  label: string
}

/**
 * Палитра категорий под светлую тему: и кружок цвета, и иконка на подложке этого цвета
 * (`CategoryIcon`) дают контраст не ниже 3:1 на `--paper` и белом (WCAG 1.4.11).
 * Произвольный цвет не предлагаем — пользовательский HEX на светлом фоне часто нечитаем.
 */
export const CATEGORY_COLORS = [
  { value: '#E03131', label: 'Красный' },
  { value: '#D9480F', label: 'Оранжевый' },
  { value: '#B45309', label: 'Янтарный' },
  { value: '#2B8A3E', label: 'Зелёный' },
  { value: '#0C8599', label: 'Бирюзовый' },
  { value: '#1971C2', label: 'Синий' },
  { value: '#7048E8', label: 'Фиолетовый' },
  { value: '#D6336C', label: 'Розовый' },
] as const satisfies readonly CategoryColor[]
