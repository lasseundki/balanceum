import type { Category, Transaction } from '../types'

export interface ParsedRow {
  type: 'expense' | 'income'
  amount: number
  date: number
  categoryId: string
  categoryName: string
  note?: string
  isExtraordinary: boolean
  isGift: boolean
}

export function parseBalanceumCSV(text: string, categories: Category[]): ParsedRow[] {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter(l => l.trim().length > 0)

  if (lines.length < 2) return []

  const catByName: Record<string, string> = {}
  for (const c of categories) {
    catByName[c.name.toLowerCase().trim()] = c.id
  }

  const rows: ParsedRow[] = []

  for (const line of lines.slice(1)) {
    const cols = line.split(';')
    if (cols.length < 3) continue

    const [dateStr, typeStr, amtStr, catName, , , note, isExtraStr, isGiftStr] = cols

    const parts = (dateStr ?? '').trim().split('.')
    if (parts.length !== 3) continue
    const [day, mon, yr] = parts.map(Number)
    if (!day || !mon || !yr) continue
    const date = new Date(yr, mon - 1, day).getTime()

    const type = (typeStr ?? '').trim() === 'Ausgabe' || (typeStr ?? '').trim() === 'Expense'
      ? 'expense'
      : 'income'

    const amount = parseFloat((amtStr ?? '').trim().replace(',', '.'))
    if (!amount || amount <= 0) continue

    const catKey = (catName ?? '').trim().toLowerCase()
    const categoryId = catByName[catKey] ?? ''

    rows.push({
      type,
      amount,
      date,
      categoryId,
      categoryName: (catName ?? '').trim(),
      note: (note ?? '').trim() || undefined,
      isExtraordinary: (isExtraStr ?? '').trim() === 'Ja' || (isExtraStr ?? '').trim() === 'Yes',
      isGift: (isGiftStr ?? '').trim() === 'Ja' || (isGiftStr ?? '').trim() === 'Yes',
    })
  }

  return rows
}

export function rowToTransaction(row: ParsedRow): Omit<Transaction, 'id'> {
  return {
    type: row.type,
    amount: row.amount,
    date: row.date,
    categoryId: row.categoryId,
    note: row.note,
    isExtraordinary: row.isExtraordinary,
    isGift: row.isGift,
    createdAt: Date.now(),
  }
}
