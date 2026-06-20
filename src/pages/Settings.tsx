import { useState } from 'react'
import { X, Download, LogOut, ChevronRight } from 'lucide-react'
import {
  useCategories, useCategoryActions,
  useMembers, useMemberActions,
  useRecurringTransactions, useRecurringActions,
  usePaymentMethods, useMembers as useAllMembers,
} from '../hooks/useFirestore'
import { useAuth } from '../contexts/AuthContext'
import { exportCSV, exportJSON } from '../lib/export'
import { fmt } from '../lib/formatters'
import type { CategoryType, TransactionType, Frequency } from '../types'

type Section = 'main' | 'categories' | 'members' | 'recurring' | 'data'

const FREQ_LABELS: Record<Frequency, string> = { daily: 'Täglich', weekly: 'Wöchentlich', monthly: 'Monatlich', yearly: 'Jährlich' }
const CAT_ICONS = ['🏠','🛒','🚗','💊','🎉','🍽️','👕','📚','✈️','💻','🧹','📋','💼','💰','📈','📌','🎁','🏥','🏋️','🎵','📱','🌿','🐾','🎓','💡']

export default function Settings() {
  const { user, logout } = useAuth()
  const categories = useCategories()
  const { addCategory, deleteCategory } = useCategoryActions()
  const members = useMembers()
  const { addMember, deleteMember } = useMemberActions()
  const recurring = useRecurringTransactions()
  const { addRecurring, deleteRecurring } = useRecurringActions()
  const paymentMethods = usePaymentMethods()
  const allMembers = useAllMembers()

  const [section, setSection] = useState<Section>('main')

  // Category form
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState('📌')
  const [catType, setCatType] = useState<CategoryType>('expense')

  // Member form
  const [memName, setMemName] = useState('')
  const [memRelation, setMemRelation] = useState('')

  // Recurring form
  const [recType, setRecType] = useState<TransactionType>('expense')
  const [recAmount, setRecAmount] = useState('')
  const [recCatId, setRecCatId] = useState('')
  const [recNote, setRecNote] = useState('')
  const [recFreq, setRecFreq] = useState<Frequency>('monthly')
  const [recStart, setRecStart] = useState(new Date().toISOString().slice(0, 10))


  async function handleAddCat() {
    if (!catName.trim()) return
    await addCategory({ name: catName.trim(), icon: catIcon, color: '#7BA89B', type: catType, order: categories.length })
    setCatName(''); setCatIcon('📌')
  }

  async function handleAddMember() {
    if (!memName.trim()) return
    await addMember({ name: memName.trim(), relation: memRelation.trim(), isMe: false })
    setMemName(''); setMemRelation('')
  }

  async function handleAddRecurring() {
    const parsed = parseFloat(recAmount.replace(',', '.'))
    if (!parsed || !recCatId) return
    await addRecurring({
      type: recType, amount: parsed, categoryId: recCatId,
      note: recNote.trim() || undefined, frequency: recFreq,
      startDate: new Date(recStart).getTime(),
      isGift: false, isExtraordinary: false,
    })
    setRecAmount(''); setRecCatId(''); setRecNote('')
  }

  if (section !== 'main') {
    return (
      <div className="px-4 pt-4 pb-nav">
        <button onClick={() => setSection('main')} className="flex items-center gap-1.5 text-accent text-sm font-medium mb-4 hover:text-accent-hover">
          ← Zurück
        </button>

        {section === 'categories' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">Kategorien</h1>
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income', 'both'] as CategoryType[]).map(t => (
                  <button key={t} onClick={() => setCatType(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${catType === t ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary'}`}>
                    {t === 'expense' ? 'Ausgabe' : t === 'income' ? 'Einnahme' : 'Beide'}
                  </button>
                ))}
              </div>
              <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Name" className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <div>
                <p className="text-xs text-text-muted mb-2">Icon auswählen</p>
                <div className="flex flex-wrap gap-2">
                  {CAT_ICONS.map(ic => (
                    <button key={ic} onClick={() => setCatIcon(ic)} className={`text-xl p-1.5 rounded-md ${catIcon === ic ? 'bg-accent-light ring-2 ring-accent' : 'hover:bg-bg-muted'}`}>{ic}</button>
                  ))}
                </div>
              </div>
              <button onClick={handleAddCat} disabled={!catName.trim()} className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40">
                Hinzufügen
              </button>
            </div>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="flex-1 text-sm font-medium text-text">{cat.name}</span>
                  <span className="text-xs text-text-muted">{cat.type === 'expense' ? 'Ausgabe' : cat.type === 'income' ? 'Einnahme' : 'Beide'}</span>
                  <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-text-muted hover:text-error hover:bg-error-light rounded-md transition-colors"><X size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'members' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">Familienmitglieder</h1>
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <input value={memName} onChange={e => setMemName(e.target.value)} placeholder="Name" className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <input value={memRelation} onChange={e => setMemRelation(e.target.value)} placeholder="Beziehung (z.B. Partner)" className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <button onClick={handleAddMember} disabled={!memName.trim()} className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40">
                Hinzufügen
              </button>
            </div>
            <div className="space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-accent-light flex items-center justify-center text-accent-dark font-semibold text-sm">
                    {m.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">{m.name}</p>
                    {m.relation && <p className="text-xs text-text-muted">{m.relation}</p>}
                  </div>
                  {!m.isMe && <button onClick={() => deleteMember(m.id)} className="p-1.5 text-text-muted hover:text-error hover:bg-error-light rounded-md transition-colors"><X size={15} /></button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'recurring' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">Wiederkehrend</h1>
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income'] as TransactionType[]).map(t => (
                  <button key={t} onClick={() => setRecType(t)} className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${recType === t ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary'}`}>
                    {t === 'expense' ? 'Ausgabe' : 'Einnahme'}
                  </button>
                ))}
              </div>
              <input type="number" value={recAmount} onChange={e => setRecAmount(e.target.value)} placeholder="Betrag" className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <select value={recCatId} onChange={e => setRecCatId(e.target.value)} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light">
                <option value="">Kategorie wählen...</option>
                {categories.filter(c => c.type === recType || c.type === 'both').map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <select value={recFreq} onChange={e => setRecFreq(e.target.value as Frequency)} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light">
                {(Object.entries(FREQ_LABELS) as [Frequency, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="date" value={recStart} onChange={e => setRecStart(e.target.value)} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <input value={recNote} onChange={e => setRecNote(e.target.value)} placeholder="Notiz (optional)" className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <button onClick={handleAddRecurring} disabled={!recAmount || !recCatId} className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40">
                Hinzufügen
              </button>
            </div>
            <div className="space-y-2">
              {recurring.map(r => {
                const cat = categories.find(c => c.id === r.categoryId)
                return (
                  <div key={r.id} className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3">
                    <span className="text-xl">{cat?.icon ?? '📌'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">{r.note || cat?.name || 'Buchung'}</p>
                      <p className="text-xs text-text-muted">{FREQ_LABELS[r.frequency]} · {r.type === 'expense' ? '−' : '+'}{fmt(r.amount)}</p>
                    </div>
                    <button onClick={() => deleteRecurring(r.id)} className="p-1.5 text-text-muted hover:text-error hover:bg-error-light rounded-md transition-colors"><X size={15} /></button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {section === 'data' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">Daten & Backup</h1>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <button onClick={() => exportCSV(user!.uid, categories, paymentMethods, allMembers)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-subtle transition-colors">
                <Download size={18} className="text-accent" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-text">CSV exportieren</p>
                  <p className="text-xs text-text-muted">Für Excel / Google Sheets</p>
                </div>
              </button>
              <div className="h-px bg-border" />
              <button onClick={() => exportJSON(user!.uid)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-subtle transition-colors">
                <Download size={18} className="text-info" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-text">JSON-Backup exportieren</p>
                  <p className="text-xs text-text-muted">Vollständige Datensicherung</p>
                </div>
              </button>
            </div>

            <div className="bg-warning-light border border-warning rounded-xl p-4 text-xs text-text-secondary">
              ℹ️ Da deine Daten nun in der Firebase-Cloud gespeichert sind, sind sie automatisch auf all deinen Geräten verfügbar. Backups sind dennoch empfohlen.
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-nav">
      <h1 className="font-heading text-2xl font-bold text-text mb-4">Einstellungen</h1>

      {/* User card */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-accent-dark font-heading text-xl font-bold">
          {user?.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-text">{user?.displayName}</p>
          <p className="text-xs text-text-muted">{user?.email}</p>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
        {([
          { key: 'categories', label: 'Kategorien', sub: `${categories.length} gesamt` },
          { key: 'members', label: 'Familienmitglieder', sub: `${members.length} Personen` },
          { key: 'recurring', label: 'Wiederkehrende Buchungen', sub: `${recurring.length} aktiv` },
          { key: 'data', label: 'Daten & Backup', sub: 'Export · Import' },
        ] as { key: Section; label: string; sub: string }[]).map(({ key, label, sub }, i) => (
          <div key={key}>
            {i > 0 && <div className="h-px bg-border" />}
            <button onClick={() => setSection(key)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-subtle transition-colors">
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-text">{label}</p>
                <p className="text-xs text-text-muted">{sub}</p>
              </div>
              <ChevronRight size={18} className="text-text-muted" />
            </button>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 border border-error rounded-xl text-error text-sm font-medium hover:bg-error-light transition-colors">
        <LogOut size={16} />
        Abmelden
      </button>
    </div>
  )
}
