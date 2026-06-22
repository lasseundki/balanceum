import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { de, enUS, es, ptBR } from 'date-fns/locale'
import { useYearTransactions, useCategories } from '../hooks/useFirestore'
import { fmt, fmtShort, fmtCurrency, fmtDateShort } from '../lib/formatters'
import { useCurrency } from '../contexts/CurrencyContext'
import { effectiveAmount, getCurrencyInfo } from '../lib/currency'

const CHART_COLORS = ['#B87B72', '#7A9EC4', '#C9A05A', '#A891C4', '#C47A91', '#7AB4C4', '#6E9E8A', '#C4A87A']

type AnalyticsTab = 'year' | 'month' | 'category'
type YearChartType = 'stacked' | 'line'

function CategoryBreakdown({
  txs,
  catMap,
  loading,
  noDataLabel,
}: {
  txs: { categoryId: string; type: string; amount: number; currency?: string; exchangeRate?: number; amountInBase?: number }[]
  catMap: Record<string, { icon: string; name: string }>
  loading: boolean
  noDataLabel: string
}) {
  const totals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of txs) {
      if (t.type !== 'expense') continue
      const eff = (t as { amountInBase?: number; amount: number }).amountInBase ?? t.amount
      map[t.categoryId] = (map[t.categoryId] ?? 0) + eff
    }
    return Object.entries(map).sort(([, a], [, b]) => b - a)
  }, [txs])

  const total = totals.reduce((s, [, v]) => s + v, 0)

  if (loading) return <div className="text-center py-6 text-text-muted text-sm">…</div>
  if (totals.length === 0) return (
    <div className="text-center py-8 text-text-muted">
      <p className="text-3xl mb-2">📊</p>
      <p className="text-sm">{noDataLabel}</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {totals.map(([id, val], idx) => {
        const cat = catMap[id]
        const pct = total > 0 ? (val / total) * 100 : 0
        const clr = CHART_COLORS[idx % CHART_COLORS.length]
        return (
          <div key={id}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg flex-shrink-0">{cat?.icon ?? '📌'}</span>
              <span className="flex-1 text-sm font-medium text-text truncate min-w-0">{cat?.name ?? '?'}</span>
              <span className="text-xs text-text-muted flex-shrink-0">{pct.toFixed(0)}%</span>
              <span className="text-sm font-semibold text-text flex-shrink-0">{fmt(val)}</span>
            </div>
            <div className="ml-7 h-1.5 bg-bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(pct, 100)}%`, background: clr }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

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
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [yearChartType, setYearChartType] = useState<YearChartType>('stacked')

  const dateLocale = i18n.language === 'de' ? de : i18n.language === 'es' ? es : i18n.language === 'pt' ? ptBR : enUS

  const MONTHS = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => format(new Date(2024, m, 1), 'LLL', { locale: dateLocale })),
    [dateLocale]
  )
  const MONTHS_LONG = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => format(new Date(2024, m, 1), 'LLLL', { locale: dateLocale })),
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

  // Top expense category IDs for stacked chart (sorted by annual total, max 8)
  const expenseCatIds = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const t of baseTxs) {
      if (t.type !== 'expense') continue
      totals[t.categoryId] = (totals[t.categoryId] ?? 0) + effectiveAmount(t)
    }
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([id]) => id)
  }, [baseTxs])

  const monthData = useMemo(() =>
    MONTHS.map((name, m) => {
      const txs = baseTxs.filter(t => new Date(t.date).getMonth() === m)
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + effectiveAmount(t), 0)
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + effectiveAmount(t), 0)
      const catAmounts: Record<string, number> = {}
      for (const tx of txs.filter(t => t.type === 'expense')) {
        catAmounts[tx.categoryId] = (catAmounts[tx.categoryId] ?? 0) + effectiveAmount(tx)
      }
      return { name, income, expense, balance: income - expense, ...catAmounts }
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

  // Outlier detection uses only variable (non-recurring) expenses and only active months
  const variableMonthExpenses = useMemo(() =>
    MONTHS.map((_, m) => {
      const txs = baseTxs.filter(t =>
        t.type === 'expense' && !t.recurringId && new Date(t.date).getMonth() === m
      )
      return txs.reduce((s, t) => s + effectiveAmount(t), 0)
    }),
    [baseTxs, MONTHS]
  )
  const activeVariableMonths = variableMonthExpenses.filter(v => v > 0)
  const avgVariableExpense = activeVariableMonths.length > 0
    ? activeVariableMonths.reduce((s, v) => s + v, 0) / activeVariableMonths.length
    : 0
  const outliers = monthData.filter((_m, i) =>
    avgVariableExpense > 0 &&
    variableMonthExpenses[i] > avgVariableExpense * 1.75 &&
    activeVariableMonths.length >= 3
  )

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

  const filteredTxs = selectedMonth !== null
    ? baseTxs.filter(t => new Date(t.date).getMonth() === selectedMonth)
    : baseTxs

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

  // Month tab data
  const viewMonthTxs = useMemo(() =>
    baseTxs.filter(t => new Date(t.date).getMonth() === viewMonth),
    [baseTxs, viewMonth]
  )
  const viewIncome = viewMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + effectiveAmount(t), 0)
  const viewExpense = viewMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + effectiveAmount(t), 0)

  const dayData = useMemo(() => {
    const daysInMonth = new Date(year, viewMonth + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, d) => {
      const day = d + 1
      const dayTxs = viewMonthTxs.filter(t => new Date(t.date).getDate() === day)
      const expense = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + effectiveAmount(t), 0)
      return { day, expense }
    })
  }, [viewMonthTxs, year, viewMonth])

  // Category tab data
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
    return transactions.filter(t => t.categoryId === selectedCatId).sort((a, b) => b.date - a.date)
  }, [selectedCatId, transactions])

  const periodLabel = selectedMonth !== null ? MONTHS[selectedMonth] : t('analytics.total')

  const TABS: { key: AnalyticsTab; label: string }[] = [
    { key: 'year', label: t('analytics.yearView') },
    { key: 'month', label: t('analytics.monthlyOverview') },
    { key: 'category', label: t('analytics.categoryView') },
  ]

  // Custom tooltip for stacked bar chart
  const StackedTooltip = ({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; fill: string; name: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    const incomeEntry = payload.find(p => p.dataKey === 'income')
    const catEntries = payload.filter(p => p.dataKey !== 'income' && p.value > 0)
    const totalExp = catEntries.reduce((s, e) => s + e.value, 0)
    return (
      <div className="bg-surface border border-border rounded-lg p-2.5 shadow-lg text-xs space-y-1 max-w-[180px]">
        <p className="font-semibold text-text mb-1.5">{label}</p>
        {incomeEntry && incomeEntry.value > 0 && (
          <p className="text-success font-medium">↑ {fmt(incomeEntry.value)}</p>
        )}
        {totalExp > 0 && (
          <>
            <p className="text-error font-medium">↓ {fmt(totalExp)}</p>
            {catEntries.map(e => (
              <p key={e.dataKey} className="flex items-center gap-1.5 text-text-secondary pl-1">
                <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.fill }} />
                <span className="truncate">{catMap[e.dataKey]?.name ?? e.name}</span>
                <span className="ml-auto pl-2 font-medium text-text flex-shrink-0">{fmt(e.value)}</span>
              </p>
            ))}
          </>
        )}
      </div>
    )
  }

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
        {TABS.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${tab === tb.key ? 'bg-surface text-text shadow-sm' : 'text-text-secondary'}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ═══ YEAR TAB ═══ */}
      {tab === 'year' && (
        <>
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

          {extraordinary > 0 && (
            <div className="bg-surface border border-border rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-text-secondary">{t('analytics.extraordinary')}</span>
              <span className="text-sm font-semibold text-warning">{fmt(extraordinary)}</span>
            </div>
          )}

          {/* Year Chart — stacked bars or line chart */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-base font-semibold text-text">{t('analytics.monthlyOverview')}</h2>
                  {/* Chart type toggle */}
                  <button
                    onClick={() => setYearChartType(v => v === 'stacked' ? 'line' : 'stacked')}
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs text-text-secondary hover:bg-bg-subtle transition-colors"
                  >
                    {yearChartType === 'stacked' ? '〜' : '▦'}
                    <ChevronRight size={12} />
                  </button>
                </div>
                {yearChartType === 'stacked' && (
                  <p className="text-xs text-text-muted mt-0.5 italic">{t('analytics.clickHint')}</p>
                )}
              </div>
              {selectedMonth !== null && (
                <button onClick={() => setSelectedMonth(null)} className="text-xs text-accent font-medium ml-2">{t('analytics.reset')}</button>
              )}
            </div>

            {loading ? (
              <div className="h-40 flex items-center justify-center text-text-muted text-sm">{t('common.loading')}</div>
            ) : yearChartType === 'stacked' ? (
              <>
                {/* Stacked bar chart: income bar + expense stacked by category */}
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={monthData} barGap={2} onClick={(e: unknown) => {
                    const ev = e as { activeTooltipIndex?: number }
                    if (ev?.activeTooltipIndex !== undefined) {
                      setSelectedMonth(prev => prev === ev.activeTooltipIndex ? null : ev.activeTooltipIndex!)
                    }
                  }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#A09890' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<StackedTooltip />} />
                    {/* Income: standalone green bar */}
                    <Bar
                      dataKey="income"
                      name={t('common.income')}
                      fill="#7BA89B"
                      radius={[3, 3, 0, 0]}
                      opacity={selectedMonth !== null ? 0.45 : 1}
                    />
                    {/* Expense: stacked by category */}
                    {expenseCatIds.map((catId, i) => (
                      <Bar
                        key={catId}
                        dataKey={catId}
                        name={catMap[catId]?.name ?? catId}
                        stackId="expense"
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        radius={i === expenseCatIds.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                        opacity={selectedMonth !== null ? 0.45 : 1}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                {/* Category color legend */}
                {expenseCatIds.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#7BA89B' }} />
                      <span className="text-xs text-text-muted">{t('common.income')}</span>
                    </div>
                    {expenseCatIds.map((catId, i) => (
                      <div key={catId} className="flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-text-muted">{catMap[catId]?.icon} {catMap[catId]?.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Line chart: income / expense / balance trends */
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={monthData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#A09890' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(val: number, name: string) => [fmt(val), name]}
                    contentStyle={{ fontSize: 12, border: '1px solid #E2DED7', borderRadius: 8, background: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Line type="monotone" dataKey="income" name={t('common.income')} stroke="#7BA89B" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="expense" name={t('common.expense')} stroke="#B87B72" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="balance" name={t('common.balance')} stroke="#7A9EC4" strokeWidth={2} strokeDasharray="4 2" dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Month detail when a bar is selected (stacked view only) */}
          {selectedMonth !== null && yearChartType === 'stacked' && (
            <div className="bg-accent-light border border-accent rounded-xl p-4 space-y-3">
              <h3 className="font-heading text-base font-semibold text-text">{MONTHS_LONG[selectedMonth]} · {t('analytics.monthlyDetail')}</h3>
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
            </div>
            <CategoryBreakdown txs={filteredTxs} catMap={catMap} loading={loading} noDataLabel={t('dashboard.noBookings')} />
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
                          <span>{info.flag}</span><span>{code}</span>
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

      {/* ═══ MONTH TAB ═══ */}
      {tab === 'month' && (
        <div className="space-y-4">
          {/* Month navigator */}
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3">
            <button
              onClick={() => setViewMonth(m => m === 0 ? 11 : m - 1)}
              className="p-1.5 rounded-md hover:bg-bg-muted text-text-secondary transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-heading text-base font-semibold text-text">{MONTHS_LONG[viewMonth]}</span>
            <button
              onClick={() => setViewMonth(m => m === 11 ? 0 : m + 1)}
              className="p-1.5 rounded-md hover:bg-bg-muted text-text-secondary transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('common.income'), val: viewIncome, color: 'text-success' },
              { label: t('common.expense'), val: viewExpense, color: 'text-error' },
              { label: t('common.balance'), val: viewIncome - viewExpense, color: viewIncome - viewExpense >= 0 ? 'text-success' : 'text-error' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-surface border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-text-muted mb-0.5">{label}</p>
                <p className={`text-sm font-bold ${color}`}>{fmtShort(val)}</p>
              </div>
            ))}
          </div>

          {/* Day-by-day chart */}
          {viewExpense > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4">
              <h2 className="font-heading text-sm font-semibold text-text mb-3">{t('common.expense')}</h2>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={dayData}>
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#A09890' }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis hide />
                  <Tooltip formatter={(val) => fmt(Number(val))} contentStyle={{ fontSize: 11, border: '1px solid #E2DED7', borderRadius: 8, background: '#fff' }} />
                  <Bar dataKey="expense" name={t('common.expense')} fill="#B87B72" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown for this month */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-base font-semibold text-text">{t('analytics.byCategory')}</h2>
              {viewExpense > 0 && <span className="text-sm font-semibold text-error">{fmt(viewExpense)}</span>}
            </div>
            <CategoryBreakdown txs={viewMonthTxs} catMap={catMap} loading={loading} noDataLabel={t('dashboard.noBookings')} />
          </div>

          {/* Extraordinary this month */}
          {viewMonthTxs.some(t => t.isExtraordinary) && (
            <div className="bg-warning-light border border-warning rounded-lg px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-text-secondary">{t('analytics.extraordinary')}</span>
              <span className="text-sm font-semibold text-warning">
                {fmt(viewMonthTxs.filter(t => t.isExtraordinary).reduce((s, t) => s + effectiveAmount(t), 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══ CATEGORY TAB ═══ */}
      {tab === 'category' && (
        <div className="space-y-4">
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
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{catMap[selectedCatId]?.icon}</span>
                  <h2 className="font-heading text-base font-semibold text-text">{catMap[selectedCatId]?.name}</h2>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={catMonthData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#A09890' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(val) => fmt(Number(val))} contentStyle={{ fontSize: 11, border: '1px solid #E2DED7', borderRadius: 8, background: '#fff' }} />
                    <Bar dataKey="total" fill="#B87B72" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                {catTxList.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">{t('analytics.noCategoryData')}</p>
                ) : catTxList.map((tx, i) => (
                  <div key={tx.id}>
                    {i > 0 && <div className="h-px bg-border mx-4" />}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">{tx.note || catMap[tx.categoryId]?.name || '?'}</p>
                        <p className="text-xs text-text-muted">{fmtDateShort(tx.date)}</p>
                      </div>
                      <span className={`text-sm font-semibold flex-shrink-0 ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
                        {tx.type === 'income' ? '+' : '−'}{fmt(effectiveAmount(tx))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
