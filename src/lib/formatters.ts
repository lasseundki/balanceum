import { format, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'

export function fmt(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export function fmtShort(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
  }
  return fmt(amount)
}

export function fmtDate(ts: number): string {
  return format(new Date(ts), 'dd.MM.yyyy', { locale: de })
}

export function fmtDateShort(ts: number): string {
  return format(new Date(ts), 'dd. MMM', { locale: de })
}

export function fmtMonthYear(year: number, month: number): string {
  return format(new Date(year, month, 1), 'MMMM yyyy', { locale: de })
}

export function monthRange(year: number, month: number) {
  const d = new Date(year, month, 1)
  return { start: startOfMonth(d).getTime(), end: endOfMonth(d).getTime() }
}

export function yearRange(year: number) {
  return {
    start: new Date(year, 0, 1).getTime(),
    end: new Date(year, 11, 31, 23, 59, 59).getTime(),
  }
}
