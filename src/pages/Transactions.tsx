import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'
import { useMonthTransactions, useCategories, useTransactionActions } from '../hooks/useFirestore'
import { fmt, fmtMonthYear } from '../lib/formatters'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default function Transactions() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const { transactions, loading } = useMonthTransactions(year, month)
  const categories = useCategories()
  const { deleteTransaction } = useTransactionActions()

  const [search, setSearch] = useState('')
  const [filterCatId, setFilterCatId] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterCatId && t.categoryId !== filterCatId) return false
      if (search) {
        const q = search.toLowerCase()
        const catName = catMap[t.categoryId]?.name?.toLowerCase() ?? ''
        const note = t.note?.toLowerCase() ?? ''
        if (!catName.includes(q) && !note.includes(q)) return false
      }
      return true
    })
  }, [transactions, filterType, filterCatId, search, catMap])

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const t of filtered) {
      const key = format(new Date(t.date), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  async function handleDelete(id: string) {
    setDeleting(id)
    await deleteTransaction(id)
    setDeleting(null)
  }

  return (
    <div className="px-4 pt-4 pb-nav">
      {/* Month Nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-bg-muted text-text-secondary transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-heading text-lg font-semibold text-text">{fmtMonthYear(year, month)}</h1>
        <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-bg-muted text-text-secondary transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Einnahmen', val: income, color: 'text-success' },
          { label: 'Ausgaben', val: expense, color: 'text-error' },
          { label: 'Saldo', val: income - expense, color: income - expense >= 0 ? 'text-success' : 'text-error' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-text-muted mb-0.5">{label}</p>
            <p className={`text-sm font-bold ${color}`}>{fmt(val)}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suchen..."
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-md bg-surface text-text focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
        />
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-3">
        {(['all', 'expense', 'income'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterType === t ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'
            }`}
          >
            {t === 'all' ? 'Alle' : t === 'expense' ? 'Ausgaben' : 'Einnahmen'}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        <button
          onClick={() => setFilterCatId('')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !filterCatId ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'
          }`}
        >
          Alle
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCatId(filterCatId === cat.id ? '' : cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterCatId === cat.id ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'
            }`}
          >
            <span>{cat.icon}</span>{cat.name}
          </button>
        ))}
      </div>

      {/* Transactions grouped by date */}
      {loading ? (
        <div className="text-center py-12 text-text-muted text-sm">Laden...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">Keine Transaktionen gefunden</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateKey, txs]) => {
            const d = new Date(dateKey)
            const dayLabel = format(d, 'EEEE, dd. MMMM', { locale: de })
            const dayTotal = txs.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)
            return (
              <div key={dateKey}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{dayLabel}</span>
                  <span className={`text-xs font-semibold ${dayTotal >= 0 ? 'text-success' : 'text-error'}`}>
                    {dayTotal >= 0 ? '+' : ''}{fmt(dayTotal)}
                  </span>
                </div>
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  {txs.map((tx, i) => {
                    const cat = catMap[tx.categoryId]
                    return (
                      <div key={tx.id}>
                        {i > 0 && <div className="h-px bg-border mx-4" />}
                        <div className="flex items-center gap-3 px-4 py-3">
                          <span className="text-xl">{cat?.icon ?? '📌'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text truncate">
                              {tx.note || cat?.name || 'Buchung'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-text-muted">{cat?.name}</span>
                              {tx.isExtraordinary && (
                                <span className="text-xs bg-warning-light text-warning px-1.5 py-0.5 rounded-sm font-medium">⚡</span>
                              )}
                              {tx.isGift && (
                                <span className="text-xs bg-info-light text-info px-1.5 py-0.5 rounded-sm font-medium">🎁</span>
                              )}
                            </div>
                          </div>
                          <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
                            {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                          </span>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            disabled={deleting === tx.id}
                            className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error-light transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
