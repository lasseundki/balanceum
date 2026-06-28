import { format, startOfMonth, endOfMonth } from 'date-fns'
import { de, enUS, es, ptBR } from 'date-fns/locale'
import i18n from '../i18n'
import { getBaseCurrency } from './currencyStore'

function dateLocale() {
  switch (i18n.language) {
    case 'de': return de
    case 'es': return es
    case 'pt': return ptBR
    default: return enUS
  }
}

function intlLocale() {
  switch (i18n.language) {
    case 'de': return 'de-DE'
    case 'es': return 'es-ES'
    case 'pt': return 'pt-BR'
    default: return 'en-US'
  }
}

export function fmt(amount: number): string {
  return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency: getBaseCurrency() }).format(amount)
}

export function fmtShort(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency: getBaseCurrency(), maximumFractionDigits: 0 }).format(amount)
  }
  return fmt(amount)
}

export function fmtCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency: getBaseCurrency(), notation: 'compact', maximumFractionDigits: 1 }).format(amount)
  }
  return fmtShort(amount)
}

export function fmtCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(intlLocale(), { style: 'currency', currency }).format(amount)
}

export function fmtDate(ts: number): string {
  return format(new Date(ts), 'P', { locale: dateLocale() })
}

export function fmtDateShort(ts: number): string {
  return format(new Date(ts), 'd MMM', { locale: dateLocale() })
}

export function fmtMonthYear(year: number, month: number): string {
  return format(new Date(year, month, 1), 'MMMM yyyy', { locale: dateLocale() })
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
