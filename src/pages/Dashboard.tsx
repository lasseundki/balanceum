import { useState } from 'react'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMonthTransactions, useCategories } from '../hooks/useFirestore'
import { fmt, fmtShort, fmtMonthYear, fmtDateShort, fmtCurrency } from '../lib/formatters'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { effectiveAmount, getCurrencyInfo } from '../lib/currency'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { baseCurrency } = useCurrency()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const { transactions, loading } = useMonthTransactions(year, month)
  const categories = useCategories()

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + effectiveAmount(t), 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + effectiveAmount(t), 0)
  const balance = income - expense

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]))

  const catTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] ?? 0) + effectiveAmount(t)
      return acc
    }, {})

  const topCats = Object.entries(catTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const hasExtraordinary = transactions.some(t => t.isExtraordinary)
  const extraordinary = transactions.filter(t => t.isExtraordinary).reduce((s, t) => s + effectiveAmount(t), 0)

  // Foreign currency breakdown
  const foreignTxs = transactions.filter(t => t.currency && t.currency !== baseCurrency)
  const foreignBreakdown = foreignTxs.reduce<Record<string, { amount: number; inBase: number }>>((acc, t) => {
    const c = t.currency!
    if (!acc[c]) acc[c] = { amount: 0, inBase: 0 }
    acc[c].amount += t.amount
    acc[c].inBase += effectiveAmount(t)
    return acc
  }, {})

  const recent = transactions.slice(0, 12)

  const displayName = user?.displayName?.split(' ')[0] ?? 'Hallo'

  return (
    <div className="px-4 pt-4 pb-nav space-y-4">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide font-semibold">{t('dashboard.welcomeBack')}</p>
          <h1 className="font-heading text-2xl font-bold text-text">{displayName}</h1>
        </div>
      </div>

      {/* Month Nav + Balance Card */}
      <div className="bg-accent rounded-xl p-5 text-text-inverse shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1 rounded-md hover:bg-white/20 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium opacity-90">{fmtMonthYear(year, month)}</span>
          <button onClick={nextMonth} className="p-1 rounded-md hover:bg-white/20 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <p className="text-xs opacity-75 uppercase tracking-wider mb-1">{t('common.balance')}</p>
        <p className={`font-heading text-4xl font-bold ${balance < 0 ? 'text-error-light' : ''}`}>
          {loading ? '...' : fmt(balance)}
        </p>

        <div className="flex gap-4 mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="opacity-80" />
            <div>
              <p className="text-xs opacity-70">{t('common.income')}</p>
              <p className="text-sm font-semibold">{fmtShort(income)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="opacity-80" />
            <div>
              <p className="text-xs opacity-70">{t('common.expense')}</p>
              <p className="text-sm font-semibold">{fmtShort(expense)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Extraordinary Alert */}
      {hasExtraordinary && (
        <div className="flex items-center gap-3 bg-warning-light border border-warning rounded-lg p-3">
          <AlertTriangle size={18} className="text-warning flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-text">{t('dashboard.extraordinaryAlert')}</p>
            <p className="text-xs text-text-secondary">{t('dashboard.extraordinaryMonth', { amount: fmt(extraordinary) })}</p>
          </div>
        </div>
      )}

      {/* Foreign Currency Summary */}
      {Object.keys(foreignBreakdown).length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="font-heading text-sm font-semibold text-text mb-2">{t('currency.breakdown')}</h2>
          <div className="space-y-1.5">
            {Object.entries(foreignBreakdown).map(([code, { amount, inBase }]) => {
              const info = getCurrencyInfo(code)
              return (
                <div key={code} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    <span>{info.flag}</span>
                    <span className="font-medium">{code}</span>
                  </span>
                  <span className="text-text-secondary">
                    {fmtCurrency(amount, code)} → <span className="font-semibold text-text">{fmt(inBase)}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top Categories */}
      {topCats.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="font-heading text-base font-semibold text-text mb-3">{t('dashboard.topExpenses')}</h2>
          <div className="space-y-3">
            {topCats.map(([catId, total]) => {
              const cat = catMap[catId]
              const pct = expense > 0 ? (total / expense) * 100 : 0
              return (
                <div key={catId}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span>{cat?.icon ?? '📌'}</span>
                      <span className="text-sm font-medium text-text">{cat?.name ?? '?'}</span>
                    </div>
                    <span className="text-sm font-semibold text-text">{fmt(total)}</span>
                  </div>
                  <div className="h-1.5 bg-bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {recent.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="font-heading text-base font-semibold text-text mb-3">{t('dashboard.recentBookings')}</h2>
          <div className="space-y-0">
            {recent.map((tx, i) => {
              const cat = catMap[tx.categoryId]
              return (
                <div key={tx.id}>
                  {i > 0 && <div className="h-px bg-border my-2" />}
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat?.icon ?? '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">
                        {tx.note || cat?.name || t('transaction.unknown')}
                      </p>
                      <p className="text-xs text-text-muted">{fmtDateShort(tx.date)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
                      {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && transactions.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <p className="text-4xl mb-3">💸</p>
          <p className="font-heading text-lg font-medium text-text-secondary">{t('dashboard.noBookings')}</p>
          <p className="text-sm mt-1">{t('dashboard.startHint')}</p>
        </div>
      )}
    </div>
  )
}
