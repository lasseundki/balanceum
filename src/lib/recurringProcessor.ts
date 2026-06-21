import type { RecurringTransaction, Transaction } from '../types'

function getExpectedDates(rec: RecurringTransaction): number[] {
  const dates: number[] = []
  const s = new Date(rec.startDate)
  let cur = new Date(s.getFullYear(), s.getMonth(), s.getDate())
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  while (cur <= today) {
    dates.push(cur.getTime())
    const next = new Date(cur)
    switch (rec.frequency) {
      case 'daily': next.setDate(next.getDate() + 1); break
      case 'weekly': next.setDate(next.getDate() + 7); break
      case 'monthly': next.setMonth(next.getMonth() + 1); break
      case 'yearly': next.setFullYear(next.getFullYear() + 1); break
    }
    cur = next
  }

  return dates
}

export async function processRecurringTransactions(
  recurring: RecurringTransaction[],
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<unknown>,
  updateRecurring: (id: string, data: Partial<RecurringTransaction>) => Promise<void>,
): Promise<void> {
  for (const rec of recurring) {
    const allExpected = getExpectedDates(rec)
    const toGenerate = rec.lastGeneratedDate !== undefined
      ? allExpected.filter(d => d > rec.lastGeneratedDate!)
      : allExpected

    if (toGenerate.length === 0) continue

    for (const dateMs of toGenerate) {
      await addTransaction({
        type: rec.type,
        amount: rec.amount,
        categoryId: rec.categoryId,
        paymentMethodId: rec.paymentMethodId,
        memberId: rec.memberId,
        note: rec.note,
        date: dateMs,
        isGift: rec.isGift,
        isExtraordinary: rec.isExtraordinary,
        createdAt: Date.now(),
        recurringId: rec.id,
      })
    }

    await updateRecurring(rec.id, { lastGeneratedDate: toGenerate[toGenerate.length - 1] })
  }
}
