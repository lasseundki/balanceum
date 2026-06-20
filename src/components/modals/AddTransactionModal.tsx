import { useState } from 'react'
import { X, Star, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useCategories, usePaymentMethods, useMembers, useTransactionActions } from '../../hooks/useFirestore'
import type { TransactionType } from '../../types'

interface Props {
  onClose: () => void
}

export default function AddTransactionModal({ onClose }: Props) {
  const { t } = useTranslation()
  const categories = useCategories()
  const paymentMethods = usePaymentMethods()
  const members = useMembers()
  const { addTransaction } = useTransactionActions()

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [note, setNote] = useState('')
  const [isGift, setIsGift] = useState(false)
  const [isExtraordinary, setIsExtraordinary] = useState(false)
  const [saving, setSaving] = useState(false)

  const filteredCats = categories.filter(c => c.type === type || c.type === 'both')

  async function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0 || !categoryId) return
    setSaving(true)
    await addTransaction({
      type,
      amount: parsed,
      date: new Date(date).getTime(),
      categoryId,
      paymentMethodId: paymentMethodId || undefined,
      memberId: memberId || undefined,
      note: note.trim() || undefined,
      isGift,
      isExtraordinary,
      createdAt: Date.now(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-surface rounded-t-xl shadow-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-text">{t('transaction.title')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-muted hover:bg-bg-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type Toggle */}
          <div className="flex bg-bg-muted rounded-lg p-1 gap-1">
            {(['expense', 'income'] as TransactionType[]).map(tx => (
              <button
                key={tx}
                onClick={() => { setType(tx); setCategoryId('') }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  type === tx ? 'bg-surface text-text shadow-sm' : 'text-text-secondary'
                }`}
              >
                {tx === 'expense' ? t('transaction.expense') : t('transaction.income')}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">{t('common.amount')}</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full border border-border rounded-md px-3 py-2.5 text-2xl font-bold text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light pr-12"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xl font-semibold text-text-muted">€</span>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">{t('common.date')}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">{t('common.category')}</label>
            <div className="grid grid-cols-4 gap-2">
              {filteredCats.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${
                    categoryId === cat.id
                      ? 'border-accent bg-accent-light text-accent-dark'
                      : 'border-border bg-surface text-text-secondary hover:bg-bg-subtle'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="truncate w-full text-center">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          {paymentMethods.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">{t('transaction.paymentMethod')}</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPaymentMethodId('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    !paymentMethodId ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'
                  }`}
                >
                  {t('transaction.none')}
                </button>
                {paymentMethods.map(pm => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethodId(pm.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      paymentMethodId === pm.id ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'
                    }`}
                  >
                    {pm.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Member */}
          {members.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">{t('transaction.forWhom')}</label>
              <div className="flex flex-wrap gap-2">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMemberId(memberId === m.id ? '' : m.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      memberId === m.id ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsExtraordinary(!isExtraordinary)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium border flex-1 justify-center transition-colors ${
                isExtraordinary ? 'bg-warning-light text-warning border-warning' : 'border-border text-text-secondary hover:bg-bg-subtle'
              }`}
            >
              <Zap size={14} />
              {t('transaction.extraordinary')}
            </button>
            <button
              onClick={() => setIsGift(!isGift)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium border flex-1 justify-center transition-colors ${
                isGift ? 'bg-info-light text-info border-info' : 'border-border text-text-secondary hover:bg-bg-subtle'
              }`}
            >
              <Star size={14} />
              {t('transaction.gift')}
            </button>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">{t('common.note')}</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('transaction.notePlaceholder')}
              className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !amount || !categoryId}
            className="w-full bg-accent text-text-inverse py-3 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40"
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
