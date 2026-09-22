import { cn } from '@/shared/lib/utils'
import { getCategoryIcon } from '../config/icons'

interface CategoryIconProps {
  /** Имя иконки с backend, напр. `shopping-cart`. */
  icon: string
  /** HEX-цвет категории. */
  color: string
  className?: string
}

/**
 * Значок категории: иконка её цвета на подложке из того же цвета, разбавленного до 16%.
 * Контраст палитры `CATEGORY_COLORS` посчитан именно для 16%. Значок декоративный —
 * рядом всегда выводится название категории.
 */
export function CategoryIcon({ icon, color, className }: CategoryIconProps) {
  const Icon = getCategoryIcon(icon)

  return (
    <span
      aria-hidden
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-full [&>svg]:size-5',
        className
      )}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      <Icon />
    </span>
  )
}
