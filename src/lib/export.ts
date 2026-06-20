import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Transaction, Category, PaymentMethod, Member } from '../types'
import { fmtDate } from './formatters'

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportCSV(uid: string, categories: Category[], paymentMethods: PaymentMethod[], members: Member[]) {
  const snap = await getDocs(collection(db, `users/${uid}/transactions`))
  const transactions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))
  transactions.sort((a, b) => b.date - a.date)

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))
  const pmMap = Object.fromEntries(paymentMethods.map(p => [p.id, p.name]))
  const memMap = Object.fromEntries(members.map(m => [m.id, m.name]))

  const header = ['Datum', 'Typ', 'Betrag', 'Kategorie', 'Zahlungsmethode', 'Person', 'Notiz', 'Außergewöhnlich', 'Geschenk'].join(';')
  const rows = transactions.map(t => [
    fmtDate(t.date),
    t.type === 'expense' ? 'Ausgabe' : 'Einnahme',
    t.amount.toFixed(2).replace('.', ','),
    catMap[t.categoryId] ?? '',
    t.paymentMethodId ? (pmMap[t.paymentMethodId] ?? '') : '',
    t.memberId ? (memMap[t.memberId] ?? '') : '',
    t.note ?? '',
    t.isExtraordinary ? 'Ja' : 'Nein',
    t.isGift ? 'Ja' : 'Nein',
  ].join(';'))

  const csv = '﻿' + [header, ...rows].join('\n')
  download(csv, `balanceum-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')
}

export async function exportJSON(uid: string) {
  const [catSnap, pmSnap, memSnap, txSnap] = await Promise.all([
    getDocs(collection(db, `users/${uid}/categories`)),
    getDocs(collection(db, `users/${uid}/paymentMethods`)),
    getDocs(collection(db, `users/${uid}/members`)),
    getDocs(collection(db, `users/${uid}/transactions`)),
  ])

  const data = {
    version: 2,
    exportedAt: Date.now(),
    categories: catSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    paymentMethods: pmSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    members: memSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    transactions: txSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  }

  download(JSON.stringify(data, null, 2), `balanceum-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
}
