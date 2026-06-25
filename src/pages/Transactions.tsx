import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMonthTransactions, useCategories } from '../hooks/useFirestore'
import TransactionDetailSheet from '../components/modals/TransactionDetailSheet'
import type { Transaction } from '../types'
import { fmt, fmtMonthYear, fmtCurrency } from '../lib/formatters'
import { useCurrency } from '../contexts/CurrencyContext'
import { effectiveAmount } from '../lib/currency'
import { format } from 'date-fns'
import { de, enUS, es, ptBR } from 'date-fns/locale'

type SpecialFilter = 'all' | 'extraordinary' | 'normal' | 'fixed' | 'gifts'

export default function Transactions() {
  const { t, i18n } = useTranslation()
  const { baseCurrency } = useCurrency()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const { transactions, loading } = useMonthTransactions(year, month)
  const categories = useCategories()

  const [search, setSearch] = useState('')
  const [filterCatId, setFilterCatId] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all')
  const [filterCurrency, setFilterCurrency] = useState<string>('')
  const [filterSpecial, setFilterSpecial] = useState<SpecialFilter>('all')
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Pending filter state (inside sheet before "Anwenden")
  const [pendingType, setPendingType] = useState<'all' | 'expense' | 'income'>('all')
  const [pendingSpecial, setPendingSpecial] = useState<SpecialFilter>('all')
  const [pendingCatId, setPendingCatId] = useState('')
  const [pendingCurrency, setPendingCurrency] = useState('')

  const dateLocale = i18n.language === 'de' ? de : i18n.language === 'es' ? es : i18n.language === 'pt' ? ptBR : enUS

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const usedForeignCurrencies = useMemo(() =>
    [...new Set(transactions.filter(tx => tx.currency && tx.currency !== baseCurrency).map(tx => tx.currency!))],
    [transactions, baseCurrency]
  )

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterType !== 'all' && tx.type !== filterType) return false
      if (filterCatId && tx.categoryId !== filterCatId) return false
      if (filterCurrency && (tx.currency ?? baseCurrency) !== filterCurrency) return false
      if (filterSpecial === 'extraordinary' && !tx.isExtraordinary) return false
      if (filterSpecial === 'normal' && tx.isExtraordinary) return false
      if (filterSpecial === 'fixed' && !tx.recurringId) return false
      if (filterSpecial === 'gifts' && !tx.isGift) return false
      if (search) {
        const q = search.toLowerCase()
        const catName = catMap[tx.categoryId]?.name?.toLowerCase() ?? ''
        const note = tx.note?.toLowerCase() ?? ''
        if (!catName.includes(q) && !note.includes(q)) return false
      }
      return true
    })
  }, [transactions, filterType, filterCatId, filterCurrency, filterSpecial, search, catMap, baseCurrency])

  const income = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + effectiveAmount(tx), 0)
  const expense = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + effectiveAmount(tx), 0)

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const tx of filtered) {
      const key = format(new Date(tx.date), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(tx)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const specialFilters: { key: SpecialFilter; label: string }[] = [
    { key: 'all', label: t('transaction.filterAll') },
    { key: 'extraordinary', label: t('transaction.filterExtraordinary') },
    { key: 'normal', label: t('transaction.filterNormal') },
    { key: 'fixed', label: t('transaction.filterFixed') },
    { key: 'gifts', label: t('transaction.filterGifts') },
  ]

  const activeFilterCount = (filterType !== 'all' ? 1 : 0)
    + (filterSpecial !== 'all' ? 1 : 0)
    + (filterCatId ? 1 : 0)
    + (filterCurrency ? 1 : 0)

  function openFilters() {
    setPendingType(filterType)
    setPendingSpecial(filterSpecial)
    setPendingCatId(filterCatId)
    setPendingCurrency(filterCurrency)
    setShowFilters(true)
  }

  function applyFilters() {
    setFilterType(pendingType)
    setFilterSpecial(pendingSpecial)
    setFilterCatId(pendingCatId)
    setFilterCurrency(pendingCurrency)
    setShowFilters(false)
  }

  function resetFilters() {
    setPendingType('all')
    setPendingSpecial('all')
    setPendingCatId('')
    setPendingCurrency('')
  }

  function clearAll() {
    setFilterType('all')
    setFilterSpecial('all')
    setFilterCatId('')
    setFilterCurrency('')
  }

  const pillCls = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex-shrink-0 ${
      active ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'
    }`

  return (
    <>
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
          { label: t('common.income'), val: income, color: 'text-success' },
          { label: t('common.expense'), val: expense, color: 'text-error' },
          { label: t('common.balance'), val: income - expense, color: income - expense >= 0 ? 'text-success' : 'text-error' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-3 text-center">
            <p className="text-xs text-text-muted mb-0.5">{label}</p>
            <p className={`text-sm font-bold ${color}`}>{fmt(val)}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter row */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('transaction.search')}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-md bg-surface text-text focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
          />
        </div>
        <button
          onClick={openFilters}
          className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-md border text-sm font-medium transition-colors flex-shrink-0 ${
            activeFilterCount > 0
              ? 'bg-accent text-text-inverse border-accent'
              : 'bg-surface border-border text-text-secondary hover:bg-bg-subtle'
          }`}
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span className="text-xs font-bold">{activeFilterCount}</span>
          )}
          {activeFilterCount === 0 && <span>Filter</span>}
        </button>
      </div>

      {/* Active filter summary chips (read-only, tap to clear all) */}
      {activeFilterCount > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {filterType !== 'all' && (
            <span className="flex-shrink-0 px-2.5 py-1 bg-accent-light text-accent-dark rounded-full text-xs font-medium border border-accent">
              {filterType === 'expense' ? t('common.expense') : t('common.income')}
            </span>
          )}
          {filterSpecial !== 'all' && (
            <span className="flex-shrink-0 px-2.5 py-1 bg-accent-light text-accent-dark rounded-full text-xs font-medium border border-accent">
              {specialFilters.find(f => f.key === filterSpecial)?.label}
            </span>
          )}
          {filterCatId && (
            <span className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-accent-light text-accent-dark rounded-full text-xs font-medium border border-accent">
              <span>{catMap[filterCatId]?.icon}</span>{catMap[filterCatId]?.name}
            </span>
          )}
          {filterCurrency && (
            <span className="flex-shrink-0 px-2.5 py-1 bg-accent-light text-accent-dark rounded-full text-xs font-medium border border-accent">
              {filterCurrency}
            </span>
          )}
          <button
            onClick={clearAll}
            className="flex-shrink-0 px-2.5 py-1 text-xs text-text-muted border border-border rounded-full hover:bg-bg-muted transition-colors"
          >
            ✕ {t('common.all')}
          </button>
        </div>
      )}

      {/* Transactions grouped by date */}
      {loading ? (
        <div className="text-center py-12 text-text-muted text-sm">{t('common.loading')}</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">{t('transaction.noBookings')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateKey, txs]) => {
            const [yr, mo, dy] = dateKey.split('-').map(Number)
            const d = new Date(yr, mo - 1, dy)
            const dayLabel = format(d, 'EEEE, d MMMM', { locale: dateLocale })
            const dayTotal = txs.reduce((s, tx) => s + (tx.type === 'income' ? effectiveAmount(tx) : -effectiveAmount(tx)), 0)
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
                        <div
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-subtle transition-colors ${
                            tx.isExtraordinary ? 'border-l-4 border-l-warning' : ''
                          }`}
                          onClick={() => setViewingTx(tx)}
                        >
                          <span className="text-xl">{cat?.icon ?? '📌'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text truncate">
                              {tx.note || cat?.name || t('transaction.unknown')}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-text-muted">{cat?.name}</span>
                              {tx.isExtraordinary && (
                                <span className="text-xs bg-warning-light text-warning px-1.5 py-0.5 rounded-sm font-medium">⚡</span>
                              )}
                              {tx.isGift && (
                                <span className="text-xs bg-info-light text-info px-1.5 py-0.5 rounded-sm font-medium">🎁</span>
                              )}
                              {tx.recurringId && (
                                <span className="text-xs text-text-muted">↻</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {tx.currency && tx.currency !== baseCurrency && (
                              <p className="text-xs text-text-muted">
                                {fmtCurrency(tx.amount, tx.currency)}
                              </p>
                            )}
                            <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
                              {tx.type === 'income' ? '+' : '−'}{fmt(effectiveAmount(tx))}
                            </span>
                          </div>
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

    {/* Filter Sheet */}
    {showFilters && (
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
        <div className="relative w-full bg-surface rounded-t-xl shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
            <h3 className="font-heading text-base font-semibold text-text">Filter</h3>
            <button
              onClick={resetFilters}
              className="text-xs text-accent font-medium px-2 py-1 rounded hover:bg-accent-light transition-colors"
            >
              {t('common.all')} {t('transaction.filterAll').toLowerCase()}
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* Type */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2.5">
                {t('common.expense')} / {t('common.income')}
              </p>
              <div className="flex gap-2">
                {(['all', 'expense', 'income'] as const).map(tp => (
                  <button key={tp} onClick={() => setPendingType(tp)} className={pillCls(pendingType === tp)}>
                    {tp === 'all' ? t('common.all') : tp === 'expense' ? t('common.expense') : t('common.income')}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Special */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2.5">
                {t('transaction.filterFixed')} / {t('transaction.filterExtraordinary')}
              </p>
              <div className="flex flex-wrap gap-2">
                {specialFilters.map(f => (
                  <button key={f.key} onClick={() => setPendingSpecial(f.key)} className={pillCls(pendingSpecial === f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Category */}
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2.5">{t('common.category')}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setPendingCatId('')} className={pillCls(!pendingCatId)}>
                  {t('common.all')}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setPendingCatId(pendingCatId === cat.id ? '' : cat.id)}
                    className={pillCls(pendingCatId === cat.id)}
                  >
                    <span className="mr-1">{cat.icon}</span>{cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency (only if foreign txs exist) */}
            {usedForeignCurrencies.length > 0 && (
              <>
                <div className="h-px bg-border" />
                <div>
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2.5">{t('currency.allCurrencies')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setPendingCurrency('')} className={pillCls(!pendingCurrency)}>
                      {t('currency.allCurrencies')}
                    </button>
                    <button onClick={() => setPendingCurrency(baseCurrency)} className={pillCls(pendingCurrency === baseCurrency)}>
                      {baseCurrency}
                    </button>
                    {usedForeignCurrencies.map(c => (
                      <button key={c} onClick={() => setPendingCurrency(pendingCurrency === c ? '' : c)} className={pillCls(pendingCurrency === c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={applyFilters}
              className="w-full bg-accent text-text-inverse py-3 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors"
            >
              {t('common.apply')}
            </button>
          </div>
        </div>
      </div>
    )}

    {viewingTx && <TransactionDetailSheet tx={viewingTx} onClose={() => setViewingTx(null)} />}
    </>
  )
}
