import { useState } from 'react'
import { Plus, X, CreditCard, Banknote, ArrowLeftRight, QrCode } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePaymentMethods, usePaymentMethodActions, useYearTransactions } from '../hooks/useFirestore'
import { fmt } from '../lib/formatters'
import type { PaymentType } from '../types'

const TYPE_ICONS: Record<PaymentType, typeof CreditCard> = {
  card: CreditCard, cash: Banknote, transfer: ArrowLeftRight, other: CreditCard, qr: QrCode,
}

const COLORS = ['#7BA89B', '#7A9EC4', '#C9A05A', '#A891C4', '#C47A91', '#7AB4C4', '#6E6860']

export default function Cards() {
  const { t } = useTranslation()
  const methods = usePaymentMethods()
  const { addPaymentMethod, deletePaymentMethod } = usePaymentMethodActions()
  const now = new Date()
  const { transactions } = useYearTransactions(now.getFullYear())

  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<PaymentType>('card')
  const [subtype, setSubtype] = useState<'debit' | 'credit'>('debit')
  const [bank, setBank] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [billingDay, setBillingDay] = useState('')
  const [saving, setSaving] = useState(false)

  function monthTotal(methodId: string) {
    const m = now.getMonth()
    return transactions
      .filter(tx => tx.paymentMethodId === methodId && new Date(tx.date).getMonth() === m && tx.type === 'expense')
      .reduce((s, tx) => s + tx.amount, 0)
  }

  function creditBalance(methodId: string, billingDayNum: number) {
    const today = now.getDate()
    const cutoff = new Date(
      now.getFullYear(),
      today >= billingDayNum ? now.getMonth() : now.getMonth() - 1,
      billingDayNum
    ).getTime()
    return transactions
      .filter(tx => tx.paymentMethodId === methodId && tx.date >= cutoff && tx.type === 'expense')
      .reduce((s, tx) => s + tx.amount, 0)
  }

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    await addPaymentMethod({
      name: name.trim(),
      type,
      subtype: type === 'card' ? subtype : undefined,
      bank: bank.trim() || undefined,
      color,
      billingDay: billingDay ? parseInt(billingDay) : undefined,
    })
    setName(''); setType('card'); setSubtype('debit'); setBank(''); setColor(COLORS[0]); setBillingDay('')
    setShowAdd(false)
    setSaving(false)
  }

  const ALL_TYPES: PaymentType[] = ['card', 'cash', 'transfer', 'qr', 'other']

  return (
    <div className="px-4 pt-4 pb-nav">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-heading text-2xl font-bold text-text">{t('cards.title')}</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-text-inverse rounded-md text-sm font-medium hover:bg-accent-hover transition-colors">
          <Plus size={16} />{t('common.add')}
        </button>
      </div>

      <div className="space-y-3">
        {methods.map(pm => {
          const Icon = TYPE_ICONS[pm.type] ?? CreditCard
          const total = monthTotal(pm.id)
          const isCredit = pm.type === 'card' && pm.subtype === 'credit'
          const balance = isCredit && pm.billingDay ? creditBalance(pm.id, pm.billingDay) : 0
          return (
            <div key={pm.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="h-1.5" style={{ background: pm.color }} />
              <div className="p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: pm.color + '20' }}>
                  <Icon size={22} style={{ color: pm.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text">{pm.name}</p>
                  <p className="text-xs text-text-muted">
                    {t(`cards.types.${pm.type}`)}
                    {pm.subtype ? ` · ${pm.subtype === 'debit' ? t('cards.subtypeDebit') : t('cards.subtypeCredit')}` : ''}
                    {pm.bank ? ` · ${pm.bank}` : ''}
                    {pm.billingDay ? ` · ${t('cards.billingInfo', { day: pm.billingDay })}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  {isCredit && pm.billingDay ? (
                    <>
                      <p className="text-xs text-text-muted mb-0.5">{t('cards.creditBalance')}</p>
                      <p className="font-semibold text-error">{balance > 0 ? fmt(balance) : '–'}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-text-muted mb-0.5">{t('cards.thisMonth')}</p>
                      <p className="font-semibold text-error">{total > 0 ? fmt(total) : '–'}</p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => deletePaymentMethod(pm.id)}
                  className="p-1.5 text-text-muted hover:text-error hover:bg-error-light rounded-md transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )
        })}
        {methods.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <CreditCard size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('cards.noCards')}</p>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAdd(false)} />
          <div className="relative w-full bg-surface rounded-t-xl p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-lg font-semibold text-text">{t('cards.addTitle')}</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 text-text-muted"><X size={20} /></button>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">{t('common.name')}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Visa" className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">{t('cards.type')}</label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_TYPES.map(pt => (
                  <button key={pt} onClick={() => setType(pt)} className={`py-2 rounded-md text-sm font-medium border transition-colors ${type === pt ? 'border-accent bg-accent-light text-accent-dark' : 'border-border text-text-secondary hover:bg-bg-subtle'}`}>
                    {t(`cards.types.${pt}`)}
                  </button>
                ))}
              </div>
            </div>

            {type === 'card' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">{t('cards.subtype')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['debit', 'credit'] as const).map(st => (
                      <button key={st} onClick={() => setSubtype(st)} className={`py-2 rounded-md text-sm font-medium border transition-colors ${subtype === st ? 'border-accent bg-accent-light text-accent-dark' : 'border-border text-text-secondary hover:bg-bg-subtle'}`}>
                        {st === 'debit' ? t('cards.subtypeDebit') : t('cards.subtypeCredit')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">{t('cards.billingDay')}</label>
                  <input type="number" min="1" max="31" value={billingDay} onChange={e => setBillingDay(e.target.value)} placeholder={t('cards.billingDayPlaceholder')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">{t('cards.bank')}</label>
              <input value={bank} onChange={e => setBank(e.target.value)} placeholder={t('cards.bankPlaceholder')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">{t('cards.color')}</label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-accent' : ''}`} style={{ background: c }} />
                ))}
              </div>
            </div>

            <button onClick={handleAdd} disabled={saving || !name.trim()} className="w-full bg-accent text-text-inverse py-3 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40">
              {saving ? t('common.saving') : t('common.add')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
