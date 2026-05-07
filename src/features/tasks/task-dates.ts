import type { DateOnlyString } from '@/lib/data-model'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const weekdayDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  weekday: 'short',
})

export function getDateOnlyValue(value: Date): DateOnlyString {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function addDaysToDateOnly(
  value: DateOnlyString,
  days: number,
): DateOnlyString {
  const date = parseDateOnly(value)

  date.setDate(date.getDate() + days)

  return getDateOnlyValue(date)
}

export function getEndOfWeekDateOnly(value: DateOnlyString) {
  const date = parseDateOnly(value)
  const daysUntilFriday = (5 - date.getDay() + 7) % 7

  return addDaysToDateOnly(value, daysUntilFriday)
}

export function getNextWeekDateOnly(value: DateOnlyString) {
  const date = parseDateOnly(value)
  const daysUntilNextMonday = (1 - date.getDay() + 7) % 7 || 7

  return addDaysToDateOnly(value, daysUntilNextMonday)
}

export function formatDateOnly(value: DateOnlyString | null) {
  if (!value) {
    return null
  }

  return dateFormatter.format(parseDateOnly(value))
}

export function formatWeekdayDate(value: DateOnlyString) {
  return weekdayDateFormatter.format(parseDateOnly(value))
}

function parseDateOnly(value: DateOnlyString) {
  const [year, month, day] = value.split('-').map(Number)

  return new Date(year, month - 1, day)
}
