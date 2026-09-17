const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Бэкенд хранит даты транзакций как полночь UTC и считает месяцы в UTC,
// поэтому форматируем в UTC — иначе в западных часовых поясах дата съедет на день назад.
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Сумма в рублях: `"1500.5"` → `"1 500,50 ₽"`. Принимает строку с бэкенда или число. */
export function formatMoney(amount: string | number): string {
  return moneyFormatter.format(Number(amount))
}

/** Дата транзакции: ISO-строка → `"14 сентября 2026 г."`. */
export function formatDate(date: string | Date): string {
  return dateFormatter.format(new Date(date))
}

/** Сегодняшняя дата в формате `YYYY-MM-DD` для `<input type="date">` (по локальному времени). */
export function todayInputValue(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Значение `<input type="date">` (`YYYY-MM-DD`) → ISO-строка на полночь UTC для API. */
export function dateInputToIso(value: string): string {
  return `${value}T00:00:00.000Z`
}
