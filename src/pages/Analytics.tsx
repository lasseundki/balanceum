import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { de, enUS, es, ptBR } from 'date-fns/locale'
import { useYearTransactions, useCategories } from '../hooks/useFirestore'
import { fmt, fmtShort, fmtCurrency, fmtDateShort } from '../lib/formatters'
import { useCurrency } from '../contexts/CurrencyContext'
import { effectiveAmount, getCurrencyInfo } from '../lib/currency'

const CHART_COLORS = ['#7BA89B', '#7A9EC4', '#C9A05A', '#A891C4', '#C47A91', '#7AB4C4', '#B87B72', '#6E9E8A']

type AnalyticsTab = 'year' | 'category'

export default function Analytics() {
  const { t, i18n } = useTranslation()
  const { baseCurrency } = useCurrency()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const { transactions, loading } = useYearTransactions(year)
  const categories = useCategories()
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [excludeFixed, setExcludeFixed] = useState(false)
  const [tab, setTab] = useState<AnalyticsTab>('year')
  const [selectedCatId, setSelectedCatId] = useState('')

  const dateLocale = i18n.language === 'de' ? de : i18n.language === 'es' ? es : i18n.language === 'pt' ? ptBR : enUS

  const MONTHS = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => format(new Date(2024, m, 1), 'LLL', { locale: dateLocale })),
    [dateLocale]
  )

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const baseTxs = useMemo(() =>
    excludeFixed ? transactions.filter(t => !t.recurringId) : transactions,
    [transactions, excludeFixed]
  )

  const fixedTxs = useMemo(() =>
    transactions.filter(t => t.recurringId && t.type === 'expense'),
    [transactions]
  )

  const monthData = useMemo(() =>
    MONTHS.map((name, m) => {
      const txs = baseTxs.filter(t => new Date(t.date).getMonth() === m)
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + effectiveAmount(t), 0)
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + effectiveAmount(t), 0)
      return { name, income, expense, balance: income - expense }
    }),
    [baseTxs, MONTHS]
  )

  const monthlyFixedAvg = useMemo(() => {
    if (fixedTxs.length === 0) return 0
    const byMonth = new Array(12).fill(0)
    for (const t of fixedTxs) byMonth[new Date(t.date).getMonth()] += effectiveAmount(t)
    const nonZero = byMonth.filter(v => v > 0)
    return nonZero.length > 0 ? nonZero.reduce((s, v) => s + v, 0) / nonZero.length : 0
  }, [fixedTxs])

  const totalIncome = monthData.reduce((s, m) => s + m.income, 0)
  const totalExpense = monthData.reduce((s, m) => s + m.expense, 0)
  const extraordinary = baseTxs.filter(t => t.isExtraordinary).reduce((s, t) => s + effectiveAmount(t), 0)

  const avgExpense = totalExpense / 12
  const outliers = monthData.filter(m => m.expense > avgExpense * 1.5 && m.expense > 0)

  const filteredTxs = selectedMonth !== null
    ? baseTxs.filter(t => new Date(t.date).getMonth() === selectedMonth)
    : baseTxs

  const catTotals = useMemo(() =>
    filteredTxs
      .filter(t => t.type === 'expense')
      .reduce<Record<string, number>>((acc, t) => {
        acc[t.categoryId] = (acc[t.categoryId] ?? 0) + effectiveAmount(t)
        return acc
      }, {}),
    [filteredTxs]
  )

  const catList = useMemo(() =>
    Object.entries(catTotals)
      .map(([id, total]) => ({ id, cat: catMap[id], total }))
      .sort((a, b) => b.total - a.total),
    [catTotals, catMap]
  )

  const catExpenseTotal = catList.reduce((s, c) => s + c.total, 0)

  const outlierDetails = useMemo(() =>
    outliers.map(o => {
      const monthIdx = MONTHS.indexOf(o.name)
      const monthTxs = transactions.filter(t => t.type === 'expense' && new Date(t.date).getMonth() === monthIdx)
      const totals = monthTxs.reduce<Record<string, number>>((acc, t) => {
        acc[t.categoryId] = (acc[t.categoryId] ?? 0) + effectiveAmount(t)
        return acc
      }, {})
      const top = Object.entries(totals)
        .map(([id, total]) => ({ cat: catMap[id], total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3)
      return { ...o, top }
    }),
    [outliers, transactions, catMap, MONTHS]
  )

  const currencyBreakdown = useMemo(() => {
    const foreign = baseTxs.filter(t => t.type === 'expense' && t.currency && t.currency !== baseCurrency)
    const map: Record<string, { inBase: number; original: number }> = {}
    for (const t of foreign) {
      if (!map[t.currency!]) map[t.currency!] = { inBase: 0, original: 0 }
      map[t.currency!].inBase += effectiveAmount(t)
      map[t.currency!].original += t.amount
    }
    return Object.entries(map).sort(([, a], [, b]) => b.inBase - a.inBase)
  }, [baseTxs, baseCurrency])

  // Category-centric view
  const catMonthData = useMemo(() => {
    if (!selectedCatId) return []
    return MONTHS.map((name, m) => {
      const total = transactions
        .filter(t => t.categoryId === selectedCatId && t.type === 'expense' && new Date(t.date).getMonth() === m)
        .reduce((s, t) => s + effectiveAmount(t), 0)
      return { name, total }
    })
  }, [selectedCatId, transactions, MONTHS])

  const catTxList = useMemo(() => {
    if (!selectedCatId) return []
    return transactions
      .filter(t => t.categoryId === selectedCatId)
      .sort((a, b) => b.date - a.date)
  }, [selectedCatId, transactions])

  const periodLabel = selectedMonth !== null ? MONTHS[selectedMonth] : t('analytics.total')

  return (
    <div className="px-4 pt-4 pb-nav space-y-4">
      {/* Year Nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-md hover:bg-bg-muted text-text-secondary transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-heading text-xl font-bold text-text">{year}</h1>
        <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-md hover:bg-bg-muted text-text-secondary transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex bg-bg-muted rounded-lg p-1 gap-1">
        {(['year', 'category'] as AnalyticsTab[]).map(t2 => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === t2 ? 'bg-surface text-text shadow-sm' : 'text-text-secondary'}`}
          >
            {t2 === 'year' ? t('analytics.yearView') : t('analytics.categoryView')}
          </button>
        ))}
      </div>

      {tab === 'category' && (
        <div className="space-y-4">
          {/* Category selector */}
          <div className="flex flex-wrap gap-2">
            {categories.filter(c => c.type === 'expense' || c.type === 'both').map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(selectedCatId === cat.id ? '' : cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedCatId === cat.id ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'
                }`}
              >
                <span>{cat.icon}</span>{cat.name}
              </button>
            ))}
          </div>

          {!selectedCatId ? (
            <div className="text-center py-10 text-text-muted">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm">{t('analytics.selectCategory')}</p>
            </div>
          ) : (
            <>
              {/* Category bar chart */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{catMap[selectedCatId]?.icon}</span>
                  <h2 className="font-heading text-base font-semibold text-text">{catMap[selectedCatId]?.name}</h2>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={catMonthData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#A09890' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(val) => fmt(Number(val))}
                      contentStyle={{ fontSize: 12, border: '1px solid #E2DED7', borderRadius: 8, background: '#fff' }}
                    />
                    <Bar dataKey="total" fill="#B87B72" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Transaction list */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                {catTxList.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">{t('analytics.noCategoryData')}</p>
                ) : (
                  catTxList.map((tx, i) => (
                    <div key={tx.id}>
                      {i > 0 && <div className="h-px bg-border mx-4" />}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">{tx.note || catMap[tx.categoryId]?.name || '?'}</p>
                          <p className="text-xs text-text-muted">{fmtDateShort(tx.date)}</p>
                        </div>
                        <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
                          {tx.type === 'income' ? '+' : '−'}{fmt(effectiveAmount(tx))}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'year' && (
        <>
          {/* Yearly Totals */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('common.income'), val: totalIncome, color: 'text-success' },
              { label: t('common.expense'), val: totalExpense, color: 'text-error' },
              { label: t('common.balance'), val: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'text-success' : 'text-error' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-surface border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-text-muted mb-0.5">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{fmtShort(val)}</p>
              </div>
            ))}
          </div>

          {/* Fixed costs toggle + card */}
          {fixedTxs.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setExcludeFixed(e => !e)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                  excludeFixed ? 'bg-accent text-text-inverse border-accent' : 'bg-surface border-border text-text-secondary hover:bg-bg-subtle'
                }`}
              >
                <span>{excludeFixed ? t('analytics.includeFixed') : t('analytics.excludeFixed')}</span>
                <span className="text-xs opacity-70">↻ {t('analytics.fixedCosts')}</span>
              </button>
              {monthlyFixedAvg > 0 && (
                <div className="bg-surface border border-border rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-text-secondary">↻ {t('analytics.fixedCostsCard')}</span>
                  <span className="text-sm font-semibold text-text">{fmt(monthlyFixedAvg)}/Mo.</span>
                </div>
              )}
            </div>
          )}

          {/* Outlier Alert */}
          {outlierDetails.length > 0 && (
            <div className="bg-warning-light border border-warning rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning flex-shrink-0" />
                <p className="text-xs font-semibold text-text">{t('analytics.outlier')}</p>
              </div>
              {outlierDetails.map((o, idx) => (
                <div key={idx} className="ml-6 space-y-1">
                  <p className="text-xs font-medium text-text">{o.name} · {fmt(o.expense)}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {o.top.map(({ cat, total }) => (
                      <span key={cat?.id ?? total} className="text-xs text-text-secondary">
                        {cat?.icon} {cat?.name} {fmt(total)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extraordinary */}
          {extraordinary > 0 && (
            <div className="bg-surface border border-border rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-text-secondary">{t('analytics.extraordinary')}</span>
              <span className="text-sm font-semibold text-warning">{fmt(extraordinary)}</span>
            </div>
          )}

          {/* Monthly Bar Chart */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-heading text-base font-semibold text-text">{t('analytics.monthlyOverview')}</h2>
              {selectedMonth !== null && (
                <button onClick={() => setSelectedMonth(null)} className="text-xs text-accent font-medium">{t('analytics.reset')}</button>
              )}
            </div>
            <p className="text-xs text-text-muted mb-3 font-heading italic">{t('analytics.clickHint')}</p>
            {loading ? (
              <div className="h-40 flex items-center justify-center text-text-muted text-sm">{t('common.loading')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthData} onClick={(e: unknown) => {
                  const ev = e as { activeTooltipIndex?: number }
                  if (ev?.activeTooltipIndex !== undefined) {
                    setSelectedMonth(prev => prev === ev.activeTooltipIndex ? null : ev.activeTooltipIndex!)
                  }
                }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#A09890' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(val) => fmt(Number(val))}
                    contentStyle={{ fontSize: 12, border: '1px solid #E2DED7', borderRadius: 8, background: '#fff' }}
                  />
                  <Bar dataKey="income" name={t('common.income')} fill="#7BA89B" radius={[4, 4, 0, 0]}
                    opacity={selectedMonth !== null ? 0.5 : 1}
                  />
                  <Bar dataKey="expense" name={t('common.expense')} fill="#B87B72" radius={[4, 4, 0, 0]}
                    opacity={selectedMonth !== null ? 0.5 : 1}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly detail when selected */}
          {selectedMonth !== null && (
            <div className="bg-surface border border-accent rounded-xl p-4 space-y-2">
              <h3 className="font-heading text-base font-semibold text-text">{MONTHS[selectedMonth]} · {t('analytics.monthlyDetail')}</h3>
              <div className="grid grid-cols-3 gap-2">
                {(() => {
                  const d = monthData[selectedMonth]
                  return [
                    { label: t('common.income'), val: d.income, color: 'text-success' },
                    { label: t('common.expense'), val: d.expense, color: 'text-error' },
                    { label: t('common.balance'), val: d.balance, color: d.balance >= 0 ? 'text-success' : 'text-error' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="text-center">
                      <p className="text-xs text-text-muted">{label}</p>
                      <p className={`text-sm font-bold ${color}`}>{fmt(val)}</p>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-heading text-base font-semibold text-text">{t('analytics.byCategory')}</h2>
                <p className="text-xs text-text-muted mt-0.5">{periodLabel}</p>
              </div>
              {catExpenseTotal > 0 && (
                <span className="text-sm font-semibold text-error">{fmt(catExpenseTotal)}</span>
              )}
            </div>

            {loading ? (
              <div className="text-center py-6 text-text-muted text-sm">{t('common.loading')}</div>
            ) : catList.length === 0 ? (
              <div className="text-center py-8 text-text-muted">
                <p className="text-3xl mb-2">📊</p>
                <p className="text-sm">{t('dashboard.noBookings')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {catList.map(({ id, cat, total }, idx) => {
                  const pct = catExpenseTotal > 0 ? (total / catExpenseTotal) * 100 : 0
                  const clr = CHART_COLORS[idx % CHART_COLORS.length]
                  return (
                    <div key={id}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg w-6 text-center flex-shrink-0">{cat?.icon ?? '📌'}</span>
                        <span className="flex-1 text-sm font-medium text-text truncate">{cat?.name ?? '?'}</span>
                        <span className="text-xs text-text-muted w-10 text-right">{pct.toFixed(0)}%</span>
                        <span className="text-sm font-semibold text-text w-20 text-right">{fmt(total)}</span>
                      </div>
                      <div className="ml-9 h-1.5 bg-bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(pct, 100)}%`, background: clr }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Currency Breakdown */}
          {currencyBreakdown.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4">
              <h2 className="font-heading text-base font-semibold text-text mb-3">{t('currency.breakdown')}</h2>
              <div className="space-y-3">
                {currencyBreakdown.map(([code, { inBase, original }]) => {
                  const info = getCurrencyInfo(code)
                  const pct = totalExpense > 0 ? (inBase / totalExpense) * 100 : 0
                  return (
                    <div key={code}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-text">
                          <span>{info.flag}</span>
                          <span>{code}</span>
                        </span>
                        <div className="text-right">
                          <p className="text-xs text-text-muted">{fmtCurrency(original, code)}</p>
                          <p className="text-sm font-semibold text-text">{fmt(inBase)}</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-info rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
