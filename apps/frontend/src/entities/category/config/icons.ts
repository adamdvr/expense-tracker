import {
  Baby,
  Briefcase,
  Bus,
  Car,
  Coffee,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  PawPrint,
  PiggyBank,
  Plane,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export interface CategoryIconOption {
  /** Имя, которое хранит backend: kebab-case, как в каталоге lucide. */
  name: string
  /** Подпись для скринридера. */
  label: string
  icon: LucideIcon
}

/** Иконка новой категории по умолчанию. */
export const DEFAULT_CATEGORY_ICON = 'tag'

/**
 * Иконки, из которых выбирается значок категории. Реестр статический: `DynamicIcon`
 * из `lucide-react/dynamic` грузил бы каждую иконку отдельным чанком при первом показе
 * и добавлял бы в бандл карту имён всех иконок lucide.
 */
export const CATEGORY_ICONS: CategoryIconOption[] = [
  { name: 'shopping-cart', label: 'Продукты', icon: ShoppingCart },
  { name: 'utensils', label: 'Кафе и рестораны', icon: Utensils },
  { name: 'coffee', label: 'Кофе', icon: Coffee },
  { name: 'house', label: 'Жильё', icon: House },
  { name: 'zap', label: 'Коммунальные услуги', icon: Zap },
  { name: 'smartphone', label: 'Связь', icon: Smartphone },
  { name: 'car', label: 'Автомобиль', icon: Car },
  { name: 'bus', label: 'Общественный транспорт', icon: Bus },
  { name: 'fuel', label: 'Топливо', icon: Fuel },
  { name: 'plane', label: 'Путешествия', icon: Plane },
  { name: 'heart-pulse', label: 'Здоровье', icon: HeartPulse },
  { name: 'dumbbell', label: 'Спорт', icon: Dumbbell },
  { name: 'sparkles', label: 'Красота', icon: Sparkles },
  { name: 'shirt', label: 'Одежда', icon: Shirt },
  { name: 'gamepad-2', label: 'Развлечения', icon: Gamepad2 },
  { name: 'gift', label: 'Подарки', icon: Gift },
  { name: 'graduation-cap', label: 'Образование', icon: GraduationCap },
  { name: 'baby', label: 'Дети', icon: Baby },
  { name: 'paw-print', label: 'Питомцы', icon: PawPrint },
  { name: 'briefcase', label: 'Работа', icon: Briefcase },
  { name: 'wallet', label: 'Кошелёк', icon: Wallet },
  { name: 'piggy-bank', label: 'Сбережения', icon: PiggyBank },
  { name: 'trending-up', label: 'Инвестиции', icon: TrendingUp },
  { name: DEFAULT_CATEGORY_ICON, label: 'Другое', icon: Tag },
]

const ICONS_BY_NAME = new Map(CATEGORY_ICONS.map((option) => [option.name, option.icon]))

/** Компонент иконки по имени с backend. Имя не из реестра (напр. заданное через API) → `Tag`. */
export function getCategoryIcon(name: string): LucideIcon {
  return ICONS_BY_NAME.get(name) ?? Tag
}
