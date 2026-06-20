import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { de, enUS, es, ptBR } from 'date-fns/locale'
import { useYearTransactions, useCategories } from '../hooks/useFirestore'
import { fmt, fmtShort } from '../lib/formatters'

const CHART_COLORS = ['#7BA89B', '#7A9EC4', '#C9A05A', '#A891C4', '#C47A91', '#7AB4C4']

export default function Analytics() {
  const { t, i18n } = useTranslation()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const { transactions, loading } = useYearTransactions(year)
  const categories = useCategories()
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const dateLocale = i18n.language === 'de' ? de : i18n.language === 'es' ? es : i18n.language === 'pt' ? ptBR : enUS

  const MONTHS = useMemo(() =>
    Array.from({ length: 12 }, (_, m) => format(new Date(2024, m, 1), 'LLL', { locale: dateLocale })),
    [dateLocale]
  )

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const monthData = useMemo(() => {
    return MONTHS.map((name, m) => {
      const txs = transactions.filter(t => new Date(t.date).getMonth() === m)
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      return { name, income, expense, balance: income - expense }
    })
  }, [transactions, MONTHS])

  const totalIncome = monthData.reduce((s, m) => s + m.income, 0)
  const totalExpense = monthData.reduce((s, m) => s + m.expense, 0)
  const extraordinary = transactions.filter(t => t.isExtraordinary).reduce((s, t) => s + t.amount, 0)

  const avgExpense = totalExpense / 12
  const outliers = monthData.filter(m => m.expense > avgExpense * 1.5 && m.expense > 0)

  const filteredTxs = selectedMonth !== null
    ? transactions.filter(t => new Date(t.date).getMonth() === selectedMonth)
    : transactions

  const catTotals = filteredTxs
    .filter(t => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] ?? 0) + t.amount
      return acc
    }, {})

  const pieData = Object.entries(catTotals)
    .map(([id, value]) => ({ name: catMap[id]?.name ?? '?', value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

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

      {/* Outlier Alert */}
      {outliers.length > 0 && (
        <div className="flex items-start gap-3 bg-warning-light border border-warning rounded-lg p-3">
          <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-text">{t('analytics.outlier')}</p>
            <p className="text-xs text-text-secondary">
              {t('analytics.outlierDesc', { months: outliers.map(o => o.name).join(', ') })}
            </p>
          </div>
        </div>
      )}

      {/* Extraordinary */}
      {extraordinary > 0 && (
        <div className="bg-surface border border-border rounded-lg p-3 flex justify-between items-center">
          <span className="text-sm text-text-secondary">{t('analytics.extraordinary')}</span>
          <span className="text-sm font-semibold text-warning">{fmt(extraordinary)}</span>
        </div>
      )}

      {/* Bar Chart */}
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
              <Bar dataKey="income" name={t('common.income')} fill="#7BA89B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name={t('common.expense')} fill="#B87B72" radius={[4, 4, 0, 0]}
                opacity={selectedMonth !== null ? 0.6 : 1}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="font-heading text-base font-semibold text-text mb-1">
            {t('analytics.byCategory')} {selectedMonth !== null ? `· ${MONTHS[selectedMonth]}` : `· ${t('analytics.total')}`}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" outerRadius={70} innerRadius={40} dataKey="value" paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(val) => fmt(Number(val))} contentStyle={{ fontSize: 12, border: '1px solid #E2DED7', borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6E6860' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
