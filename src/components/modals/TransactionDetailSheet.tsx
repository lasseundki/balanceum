import { useState, useEffect } from 'react'
import { X, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTransactionActions, useCategories, usePaymentMethods, useMembers } from '../../hooks/useFirestore'
import { fmt, fmtCurrency, fmtDateShort } from '../../lib/formatters'
import { effectiveAmount } from '../../lib/currency'
import { useCurrency } from '../../contexts/CurrencyContext'
import EditTransactionModal from './EditTransactionModal'
import type { Transaction } from '../../types'

interface Props {
  tx: Transaction
  onClose: () => void
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start px-4 py-2.5 gap-4">
      <span className="text-sm text-text-muted flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-text text-right">{value}</span>
    </div>
  )
}

export default function TransactionDetailSheet({ tx, onClose }: Props) {
  const { t } = useTranslation()
  const { baseCurrency } = useCurrency()
  const categories = useCategories()
  const paymentMethods = usePaymentMethods()
  const members = useMembers()
  const { deleteTransaction, addTransaction } = useTransactionActions()

  const [editing, setEditing] = useState(false)
  const [undoVisible, setUndoVisible] = useState(false)
  const [deletedTx, setDeletedTx] = useState<Transaction | null>(null)

  const cat = categories.find(c => c.id === tx.categoryId)
  const pm = paymentMethods.find(p => p.id === tx.paymentMethodId)
  const effectiveMemberIds = tx.memberIds ?? (tx.memberId ? [tx.memberId] : [])
  const memberNames = members.filter(m => effectiveMemberIds.includes(m.id)).map(m => m.name).join(', ')

  async function handleDelete() {
    setDeletedTx(tx)
    await deleteTransaction(tx.id)
    setUndoVisible(true)
  }

  async function handleUndo() {
    if (!deletedTx) return
    const { id: _id, ...rest } = deletedTx
    await addTransaction(rest as Omit<Transaction, 'id'>)
    setUndoVisible(false)
    setDeletedTx(null)
    onClose()
  }

  useEffect(() => {
    if (!undoVisible) return
    const timer = setTimeout(() => {
      setUndoVisible(false)
      setDeletedTx(null)
      onClose()
    }, 5000)
    return () => clearTimeout(timer)
  }, [undoVisible, onClose])

  if (editing) {
    return <EditTransactionModal tx={tx} onClose={() => { setEditing(false); onClose() }} />
  }

  if (undoVisible) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/10" onClick={() => { setUndoVisible(false); onClose() }} />
        <div className="fixed bottom-24 left-4 right-4 z-[60] flex items-center gap-3 bg-text text-bg px-4 py-3.5 rounded-xl shadow-xl">
          <span className="flex-1 text-sm font-medium">{t('transaction.deleted')}</span>
          <button
            onClick={handleUndo}
            className="text-sm font-bold text-accent-light hover:underline transition-colors"
          >
            {t('transaction.undoDelete')}
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-surface rounded-t-xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-text">{t('transaction.details')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-muted hover:bg-bg-muted transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Amount hero */}
          <div className="flex items-center gap-4 py-2">
            <div className="w-14 h-14 rounded-2xl bg-bg-subtle flex items-center justify-center text-3xl">
              {cat?.icon ?? '📌'}
            </div>
            <div>
              <p className={`font-heading text-3xl font-bold ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
                {tx.type === 'income' ? '+' : '−'}{fmt(effectiveAmount(tx))}
              </p>
              {tx.currency && tx.currency !== baseCurrency && (
                <p className="text-sm text-text-muted">{fmtCurrency(tx.amount, tx.currency)}</p>
              )}
            </div>
          </div>

          {/* Details list */}
          <div className="bg-bg-subtle rounded-xl divide-y divide-border">
            <Row label={t('common.category')} value={`${cat?.icon ?? ''} ${cat?.name ?? '?'}`} />
            <Row label={t('common.date')} value={fmtDateShort(tx.date)} />
            {tx.note ? <Row label={t('common.note')} value={tx.note} /> : null}
            {pm ? <Row label={t('transaction.paymentMethod')} value={pm.name} /> : null}
            {memberNames ? <Row label={t('transaction.forWhom')} value={memberNames} /> : null}
            {tx.currency && tx.currency !== baseCurrency && tx.exchangeRate ? (
              <Row label={t('currency.rateLabel')} value={`1 ${tx.currency} = ${tx.exchangeRate.toFixed(4)} ${baseCurrency}`} />
            ) : null}
            {tx.recurringId ? <Row label="Fixkosten" value="↻" /> : null}
          </div>

          {/* Flags */}
          {(tx.isExtraordinary || tx.isGift) && (
            <div className="flex gap-2 flex-wrap">
              {tx.isExtraordinary && (
                <span className="px-3 py-1.5 bg-warning-light text-warning rounded-full text-xs font-semibold">
                  ⚡ {t('transaction.extraordinary')}
                </span>
              )}
              {tx.isGift && (
                <span className="px-3 py-1.5 bg-info-light text-info rounded-full text-xs font-semibold">
                  🎁 {t('transaction.gift')}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 flex-1 py-3 border border-error text-error rounded-lg text-sm font-medium hover:bg-error-light transition-colors"
            >
              <Trash2 size={15} />
              Löschen
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center justify-center gap-2 flex-1 py-3 bg-accent text-text-inverse rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors"
            >
              <Pencil size={15} />
              {t('transaction.editTitle')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
