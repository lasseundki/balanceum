import { useState, useRef } from 'react'
import { X, Download, Upload, LogOut, ChevronRight, Check, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  useCategories, useCategoryActions,
  useMembers, useMemberActions,
  useRecurringTransactions, useRecurringActions,
  usePaymentMethods, useMembers as useAllMembers,
  useBudgets, useBudgetActions,
  useTemplates, useTemplateActions,
  useTransactionActions,
} from '../hooks/useFirestore'
import { useAuth } from '../contexts/AuthContext'
import { useAccessibility } from '../contexts/AccessibilityContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { CURRENCIES } from '../lib/currency'
import { exportCSV, exportJSON } from '../lib/export'
import { fmt } from '../lib/formatters'
import { parseBalanceumCSV, rowToTransaction, type ParsedRow } from '../lib/csvImport'
import type { CategoryType, TransactionType, Frequency } from '../types'

type Section = 'main' | 'categories' | 'members' | 'recurring' | 'budgets' | 'templates' | 'data' | 'language' | 'accessibility' | 'currency'

const CAT_ICONS = [
  '🏠','🧹','🛋️','🔧','💡','🛁','🪴','🏡','🪟','🚿','🛒','🧺',
  '🍽️','☕','🍕','🍺','🥗','🍣','🥘','🧁','🍱','🥩','🫖','🛍️',
  '🚗','✈️','🚌','🚂','⛽','🛵','🚕','🚢','🛴','🚲','🚁','🅿️',
  '💊','🏥','🏋️','🧘','🦷','👓','❤️','🩺','🧬','💉','🩹','🧴',
  '🎉','🎵','🎮','🎬','🎭','📚','🎨','🏖️','🎸','🎲','⚽','🎤',
  '👕','👟','👜','💄','💍','⌚','🕶️','👗','🧣','🧥','🩴','👒',
  '💰','📈','💼','📊','🏦','💳','📋','🧾','💸','📉','🏢','📝',
  '💻','📱','🖥️','🎧','📷','🔌','🖨️','📡','🎙️','⌨️','🖱️','📺',
  '🎁','🐾','🌿','🎓','👶','🏫','🤝','🎊','🌺','🎀','🕯️','🎈',
  '📌','🌍','⭐','🔑','📦','🎯','💫','🌈','✉️','🔒','🗺️','⚡',
]

const LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
]

const COLLAPSED_ICON_COUNT = 14

function IconPicker({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (icon: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const icons = showAll ? CAT_ICONS : CAT_ICONS.slice(0, COLLAPSED_ICON_COUNT)
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {icons.map(ic => (
          <button key={ic} onClick={() => onSelect(ic)} className={`text-xl p-1.5 rounded-md ${selected === ic ? 'bg-accent-light ring-2 ring-accent' : 'hover:bg-bg-muted'}`}>{ic}</button>
        ))}
      </div>
      <button
        onClick={() => setShowAll(s => !s)}
        className="mt-2 flex items-center gap-1 text-xs text-accent font-medium"
      >
        {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showAll ? 'Weniger' : `Mehr (${CAT_ICONS.length - COLLAPSED_ICON_COUNT})`}
      </button>
    </div>
  )
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { fontSize, setFontSize, highContrast, setHighContrast } = useAccessibility()
  const { baseCurrency, setBaseCurrency } = useCurrency()
  const categories = useCategories()
  const { addCategory, deleteCategory, updateCategory } = useCategoryActions()
  const members = useMembers()
  const { addMember, deleteMember } = useMemberActions()
  const recurring = useRecurringTransactions()
  const { addRecurring, deleteRecurring, updateRecurring } = useRecurringActions()
  const paymentMethods = usePaymentMethods()
  const allMembers = useAllMembers()
  const budgets = useBudgets()
  const { setBudget, deleteBudget } = useBudgetActions()
  const templates = useTemplates()
  const { addTemplate, deleteTemplate } = useTemplateActions()
  const { addTransaction } = useTransactionActions()

  const [section, setSection] = useState<Section>('main')

  // Category form
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState('📌')
  const [catType, setCatType] = useState<CategoryType>('expense')

  // Category edit
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatIcon, setEditCatIcon] = useState('📌')
  const [editCatType, setEditCatType] = useState<CategoryType>('expense')

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

  // Recurring edit
  const [editingRecId, setEditingRecId] = useState<string | null>(null)
  const [editRecType, setEditRecType] = useState<TransactionType>('expense')
  const [editRecAmount, setEditRecAmount] = useState('')
  const [editRecCatId, setEditRecCatId] = useState('')
  const [editRecNote, setEditRecNote] = useState('')
  const [editRecFreq, setEditRecFreq] = useState<Frequency>('monthly')
  const [editRecStart, setEditRecStart] = useState('')

  // Budget form
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({})

  // Template form
  const [tmplName, setTmplName] = useState('')
  const [tmplType, setTmplType] = useState<TransactionType>('expense')
  const [tmplAmount, setTmplAmount] = useState('')
  const [tmplCatId, setTmplCatId] = useState('')
  const [tmplNote, setTmplNote] = useState('')
  const [tmplIsGift, setTmplIsGift] = useState(false)
  const [tmplIsExtra, setTmplIsExtra] = useState(false)

  // CSV import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvRows, setCsvRows] = useState<ParsedRow[] | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvError, setCsvError] = useState(false)

  const FREQ_LABELS: Record<Frequency, string> = {
    daily: t('settings.frequencies.daily'),
    weekly: t('settings.frequencies.weekly'),
    monthly: t('settings.frequencies.monthly'),
    yearly: t('settings.frequencies.yearly'),
  }

  async function handleAddCat() {
    if (!catName.trim()) return
    await addCategory({ name: catName.trim(), icon: catIcon, color: '#7BA89B', type: catType, order: categories.length })
    setCatName(''); setCatIcon('📌')
  }

  function startEditCat(cat: { id: string; name: string; icon: string; type: CategoryType }) {
    setEditingCatId(cat.id)
    setEditCatName(cat.name)
    setEditCatIcon(cat.icon)
    setEditCatType(cat.type)
  }

  async function handleSaveEditCat() {
    if (!editCatName.trim() || !editingCatId) return
    await updateCategory(editingCatId, { name: editCatName.trim(), icon: editCatIcon, type: editCatType })
    setEditingCatId(null)
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
      startDate: (() => { const [y, m, d] = recStart.split('-').map(Number); return new Date(y, m - 1, d).getTime() })(),
      isGift: false, isExtraordinary: false,
    })
    setRecAmount(''); setRecCatId(''); setRecNote('')
  }

  function startEditRec(r: typeof recurring[0]) {
    setEditingRecId(r.id)
    setEditRecType(r.type)
    setEditRecAmount(String(r.amount).replace('.', ','))
    setEditRecCatId(r.categoryId)
    setEditRecNote(r.note ?? '')
    setEditRecFreq(r.frequency)
    const d = new Date(r.startDate)
    setEditRecStart(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
  }

  async function handleSaveEditRec() {
    if (!editingRecId || !editRecAmount || !editRecCatId) return
    const parsed = parseFloat(editRecAmount.replace(',', '.'))
    if (!parsed) return
    await updateRecurring(editingRecId, {
      type: editRecType,
      amount: parsed,
      categoryId: editRecCatId,
      note: editRecNote.trim() || undefined,
      frequency: editRecFreq,
      startDate: (() => { const [y, m, d] = editRecStart.split('-').map(Number); return new Date(y, m - 1, d).getTime() })(),
    })
    setEditingRecId(null)
  }

  async function handleSetBudget(catId: string) {
    const val = parseFloat((budgetInputs[catId] ?? '').replace(',', '.'))
    if (!val || val <= 0) return
    await setBudget(catId, val)
    setBudgetInputs(prev => ({ ...prev, [catId]: '' }))
  }

  async function handleDeleteBudget(catId: string) {
    const existing = budgets.find(b => b.categoryId === catId)
    if (existing) await deleteBudget(existing.id)
  }

  async function handleAddTemplate() {
    const parsed = parseFloat(tmplAmount.replace(',', '.'))
    if (!tmplName.trim() || !parsed || !tmplCatId) return
    await addTemplate({
      name: tmplName.trim(),
      type: tmplType,
      amount: parsed,
      categoryId: tmplCatId,
      note: tmplNote.trim() || undefined,
      isGift: tmplIsGift,
      isExtraordinary: tmplIsExtra,
    })
    setTmplName(''); setTmplAmount(''); setTmplCatId(''); setTmplNote(''); setTmplIsGift(false); setTmplIsExtra(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError(false)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const rows = parseBalanceumCSV(text, categories)
        setCsvRows(rows)
      } catch {
        setCsvError(true)
      }
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  async function handleCsvImport() {
    if (!csvRows || csvRows.length === 0) return
    setCsvImporting(true)
    for (const row of csvRows) {
      await addTransaction(rowToTransaction(row))
    }
    setCsvRows(null)
    setCsvImporting(false)
  }

  function changeLanguage(code: string) {
    i18n.changeLanguage(code)
    localStorage.setItem('balanceum_lang', code)
  }

  if (section !== 'main') {
    return (
      <div className="px-4 pt-4 pb-nav">
        <button onClick={() => setSection('main')} className="flex items-center gap-1.5 text-accent text-sm font-medium mb-4 hover:text-accent-hover">
          {t('common.back')}
        </button>

        {section === 'language' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">{t('settings.language')}</h1>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {LANGUAGES.map((lang, i) => (
                <div key={lang.code}>
                  {i > 0 && <div className="h-px bg-border" />}
                  <button onClick={() => changeLanguage(lang.code)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-subtle transition-colors">
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="flex-1 text-left text-sm font-medium text-text">{lang.label}</span>
                    {i18n.language === lang.code && <Check size={18} className="text-accent" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'accessibility' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">{t('settings.accessibility')}</h1>
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-text">{t('settings.fontSize')}</p>
              <div className="flex gap-2">
                {(['sm', 'md', 'lg'] as const).map(size => (
                  <button key={size} onClick={() => setFontSize(size)} className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${fontSize === size ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'}`}>
                    {size === 'sm' ? t('settings.fontSm') : size === 'md' ? t('settings.fontMd') : t('settings.fontLg')}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">{t('settings.highContrast')}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t('settings.highContrastDesc')}</p>
                </div>
                <button onClick={() => setHighContrast(!highContrast)} className={`relative w-12 h-6 rounded-full transition-colors ${highContrast ? 'bg-accent' : 'bg-bg-muted'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${highContrast ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        )}

        {section === 'currency' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">{t('currency.title')}</h1>
            <p className="text-sm text-text-secondary">{t('currency.homeDesc')}</p>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {CURRENCIES.map((c, i) => (
                <div key={c.code}>
                  {i > 0 && <div className="h-px bg-border" />}
                  <button onClick={() => setBaseCurrency(c.code)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-subtle transition-colors">
                    <span className="text-xl">{c.flag}</span>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-medium text-text">{c.code}</span>
                      <span className="text-xs text-text-muted ml-2">{c.name}</span>
                    </div>
                    <span className="text-sm text-text-muted mr-2">{c.symbol}</span>
                    {baseCurrency === c.code && <Check size={18} className="text-accent" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'categories' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">{t('settings.categories')}</h1>
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income', 'both'] as CategoryType[]).map(ct => (
                  <button key={ct} onClick={() => setCatType(ct)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${catType === ct ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary'}`}>
                    {ct === 'expense' ? t('settings.catType.expense') : ct === 'income' ? t('settings.catType.income') : t('settings.catType.both')}
                  </button>
                ))}
              </div>
              <input value={catName} onChange={e => setCatName(e.target.value)} placeholder={t('common.name')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <div>
                <p className="text-xs text-text-muted mb-2">{t('settings.selectIcon')}</p>
                <IconPicker selected={catIcon} onSelect={setCatIcon} />
              </div>
              <button onClick={handleAddCat} disabled={!catName.trim()} className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40">
                {t('common.add')}
              </button>
            </div>
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                  {editingCatId === cat.id ? (
                    <div className="p-3 space-y-3">
                      <div className="flex gap-2">
                        {(['expense', 'income', 'both'] as CategoryType[]).map(ct => (
                          <button key={ct} onClick={() => setEditCatType(ct)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${editCatType === ct ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary'}`}>
                            {ct === 'expense' ? t('settings.catType.expense') : ct === 'income' ? t('settings.catType.income') : t('settings.catType.both')}
                          </button>
                        ))}
                      </div>
                      <input value={editCatName} onChange={e => setEditCatName(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
                      <IconPicker selected={editCatIcon} onSelect={setEditCatIcon} />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingCatId(null)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-bg-subtle transition-colors">{t('common.cancel')}</button>
                        <button onClick={handleSaveEditCat} disabled={!editCatName.trim()} className="flex-1 py-2 rounded-lg bg-accent text-text-inverse text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-40">{t('common.save')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="flex-1 text-sm font-medium text-text">{cat.name}</span>
                      <span className="text-xs text-text-muted">{cat.type === 'expense' ? t('settings.catType.expense') : cat.type === 'income' ? t('settings.catType.income') : t('settings.catType.both')}</span>
                      <button onClick={() => startEditCat(cat)} className="p-1.5 text-text-muted hover:text-accent hover:bg-accent-light rounded-md transition-colors"><Pencil size={15} /></button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-text-muted hover:text-error hover:bg-error-light rounded-md transition-colors"><X size={15} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'members' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">{t('settings.members')}</h1>
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <input value={memName} onChange={e => setMemName(e.target.value)} placeholder={t('common.name')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <input value={memRelation} onChange={e => setMemRelation(e.target.value)} placeholder={t('settings.relation')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <button onClick={handleAddMember} disabled={!memName.trim()} className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40">
                {t('common.add')}
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
            <h1 className="font-heading text-xl font-bold text-text">{t('settings.recurring')}</h1>
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                {(['expense', 'income'] as TransactionType[]).map(rt => (
                  <button key={rt} onClick={() => setRecType(rt)} className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${recType === rt ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary'}`}>
                    {rt === 'expense' ? t('transaction.expense') : t('transaction.income')}
                  </button>
                ))}
              </div>
              <input type="number" value={recAmount} onChange={e => setRecAmount(e.target.value)} placeholder={t('common.amount')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <select value={recCatId} onChange={e => setRecCatId(e.target.value)} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light">
                <option value="">{t('settings.selectCategory')}</option>
                {categories.filter(c => c.type === recType || c.type === 'both').map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <select value={recFreq} onChange={e => setRecFreq(e.target.value as Frequency)} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light">
                {(Object.entries(FREQ_LABELS) as [Frequency, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">{t('settings.startDate')}</label>
                <input type="date" value={recStart} onChange={e => setRecStart(e.target.value)} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              </div>
              <input value={recNote} onChange={e => setRecNote(e.target.value)} placeholder={t('transaction.notePlaceholder')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <button onClick={handleAddRecurring} disabled={!recAmount || !recCatId} className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40">
                {t('common.add')}
              </button>
            </div>
            <div className="space-y-2">
              {recurring.map(r => {
                const cat = categories.find(c => c.id === r.categoryId)
                return (
                  <div key={r.id} className="bg-surface border border-border rounded-lg overflow-hidden">
                    {editingRecId === r.id ? (
                      <div className="p-3 space-y-3">
                        <div className="flex gap-2">
                          {(['expense', 'income'] as TransactionType[]).map(rt => (
                            <button key={rt} onClick={() => setEditRecType(rt)} className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${editRecType === rt ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary'}`}>
                              {rt === 'expense' ? t('transaction.expense') : t('transaction.income')}
                            </button>
                          ))}
                        </div>
                        <input type="number" value={editRecAmount} onChange={e => setEditRecAmount(e.target.value)} placeholder={t('common.amount')} className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent" />
                        <select value={editRecCatId} onChange={e => setEditRecCatId(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent">
                          <option value="">{t('settings.selectCategory')}</option>
                          {categories.filter(c => c.type === editRecType || c.type === 'both').map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </select>
                        <select value={editRecFreq} onChange={e => setEditRecFreq(e.target.value as Frequency)} className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent">
                          {(Object.entries(FREQ_LABELS) as [Frequency, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <div>
                          <label className="block text-xs text-text-muted mb-1">{t('settings.startDate')}</label>
                          <input type="date" value={editRecStart} onChange={e => setEditRecStart(e.target.value)} className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent" />
                        </div>
                        <input value={editRecNote} onChange={e => setEditRecNote(e.target.value)} placeholder={t('transaction.notePlaceholder')} className="w-full border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent" />
                        <div className="flex gap-2">
                          <button onClick={() => setEditingRecId(null)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-bg-subtle">{t('common.cancel')}</button>
                          <button onClick={handleSaveEditRec} disabled={!editRecAmount || !editRecCatId} className="flex-1 py-2 rounded-lg bg-accent text-text-inverse text-sm font-semibold hover:bg-accent-hover disabled:opacity-40">{t('common.save')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="text-xl">{cat?.icon ?? '📌'}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text">{r.note || cat?.name || t('transaction.unknown')}</p>
                          <p className="text-xs text-text-muted">{FREQ_LABELS[r.frequency]} · {r.type === 'expense' ? '−' : '+'}{fmt(r.amount)}</p>
                        </div>
                        <button onClick={() => startEditRec(r)} className="p-1.5 text-text-muted hover:text-accent hover:bg-accent-light rounded-md transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => deleteRecurring(r.id)} className="p-1.5 text-text-muted hover:text-error hover:bg-error-light rounded-md transition-colors"><X size={15} /></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {section === 'budgets' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">{t('settings.budgets')}</h1>
            <p className="text-sm text-text-secondary">Lege monatliche Ausgabenlimits pro Kategorie fest.</p>
            {categories.filter(c => c.type === 'expense' || c.type === 'both').length === 0 ? (
              <p className="text-sm text-text-muted text-center py-8">{t('settings.noBudgets')}</p>
            ) : (
              <div className="space-y-2">
                {categories.filter(c => c.type === 'expense' || c.type === 'both').map(cat => {
                  const existing = budgets.find(b => b.categoryId === cat.id)
                  return (
                    <div key={cat.id} className="bg-surface border border-border rounded-lg p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="flex-1 text-sm font-medium text-text">{cat.name}</span>
                        {existing && (
                          <span className="text-sm font-semibold text-accent">{fmt(existing.amount)}/Mo.</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={budgetInputs[cat.id] ?? ''}
                          onChange={e => setBudgetInputs(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          placeholder={existing ? String(existing.amount) : t('settings.monthlyBudget')}
                          className="flex-1 border border-border rounded-md px-3 py-2 text-sm text-text bg-surface focus:outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => handleSetBudget(cat.id)}
                          disabled={!budgetInputs[cat.id]}
                          className="px-3 py-2 bg-accent text-text-inverse rounded-md text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors"
                        >
                          {t('common.save')}
                        </button>
                        {existing && (
                          <button
                            onClick={() => handleDeleteBudget(cat.id)}
                            className="p-2 text-text-muted hover:text-error hover:bg-error-light rounded-md transition-colors"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {section === 'templates' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">{t('settings.templates')}</h1>
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <input value={tmplName} onChange={e => setTmplName(e.target.value)} placeholder={t('settings.templateName')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <div className="flex gap-2">
                {(['expense', 'income'] as TransactionType[]).map(tp => (
                  <button key={tp} onClick={() => setTmplType(tp)} className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${tmplType === tp ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary'}`}>
                    {tp === 'expense' ? t('transaction.expense') : t('transaction.income')}
                  </button>
                ))}
              </div>
              <input type="number" value={tmplAmount} onChange={e => setTmplAmount(e.target.value)} placeholder={t('common.amount')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <select value={tmplCatId} onChange={e => setTmplCatId(e.target.value)} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light">
                <option value="">{t('settings.selectCategory')}</option>
                {categories.filter(c => c.type === tmplType || c.type === 'both').map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <input value={tmplNote} onChange={e => setTmplNote(e.target.value)} placeholder={t('transaction.notePlaceholder')} className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-text bg-surface focus:outline-none focus:border-accent focus:ring-3 focus:ring-accent-light" />
              <div className="flex gap-3">
                <button onClick={() => setTmplIsExtra(!tmplIsExtra)} className={`flex-1 py-2 rounded-md text-xs font-medium border transition-colors ${tmplIsExtra ? 'bg-warning-light text-warning border-warning' : 'border-border text-text-secondary'}`}>
                  ⚡ {t('transaction.extraordinary')}
                </button>
                <button onClick={() => setTmplIsGift(!tmplIsGift)} className={`flex-1 py-2 rounded-md text-xs font-medium border transition-colors ${tmplIsGift ? 'bg-info-light text-info border-info' : 'border-border text-text-secondary'}`}>
                  🎁 {t('transaction.gift')}
                </button>
              </div>
              <button onClick={handleAddTemplate} disabled={!tmplName.trim() || !tmplAmount || !tmplCatId} className="w-full bg-accent text-text-inverse py-2.5 rounded-lg font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-40">
                {t('common.add')}
              </button>
            </div>
            {templates.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">{t('settings.noTemplates')}</p>
            ) : (
              <div className="space-y-2">
                {templates.map(tmpl => {
                  const cat = categories.find(c => c.id === tmpl.categoryId)
                  return (
                    <div key={tmpl.id} className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3">
                      <span className="text-xl">{cat?.icon ?? '📌'}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text">{tmpl.name}</p>
                        <p className="text-xs text-text-muted">{cat?.name} · {tmpl.type === 'expense' ? '−' : '+'}{fmt(tmpl.amount)}</p>
                      </div>
                      <button onClick={() => deleteTemplate(tmpl.id)} className="p-1.5 text-text-muted hover:text-error hover:bg-error-light rounded-md transition-colors"><X size={15} /></button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {section === 'data' && (
          <div className="space-y-4">
            <h1 className="font-heading text-xl font-bold text-text">{t('settings.data')}</h1>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <button onClick={() => exportCSV(user!.uid, categories, paymentMethods, allMembers)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-subtle transition-colors">
                <Download size={18} className="text-accent" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-text">{t('settings.csvExport')}</p>
                  <p className="text-xs text-text-muted">{t('settings.csvExportDesc')}</p>
                </div>
              </button>
              <div className="h-px bg-border" />
              <button onClick={() => exportJSON(user!.uid)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-subtle transition-colors">
                <Download size={18} className="text-info" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-text">{t('settings.jsonExport')}</p>
                  <p className="text-xs text-text-muted">{t('settings.jsonExportDesc')}</p>
                </div>
              </button>
              <div className="h-px bg-border" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-subtle transition-colors">
                <Upload size={18} className="text-success" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-text">{t('settings.csvImport')}</p>
                  <p className="text-xs text-text-muted">{t('settings.csvImportDesc')}</p>
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            </div>

            {csvError && (
              <div className="bg-error-light border border-error rounded-lg px-4 py-3 text-sm text-error">
                {t('settings.csvError')}
              </div>
            )}

            {csvRows !== null && (
              <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-text">{t('settings.csvPreview', { count: csvRows.length })}</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {csvRows.slice(0, 20).map((row, i) => {
                    const cat = categories.find(c => c.id === row.categoryId)
                    return (
                      <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-border/50 last:border-0">
                        <span className="text-text-secondary flex items-center gap-1">
                          {cat ? `${cat.icon} ${cat.name}` : row.categoryName}
                          {row.note ? ` · ${row.note}` : ''}
                        </span>
                        <span className={`font-semibold ${row.type === 'income' ? 'text-success' : 'text-error'}`}>
                          {row.type === 'income' ? '+' : '−'}{fmt(row.amount)}
                        </span>
                      </div>
                    )
                  })}
                  {csvRows.length > 20 && (
                    <p className="text-xs text-text-muted text-center pt-1">…und {csvRows.length - 20} weitere</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCsvRows(null)} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-bg-subtle">{t('common.cancel')}</button>
                  <button onClick={handleCsvImport} disabled={csvImporting || csvRows.length === 0} className="flex-1 py-2 rounded-lg bg-accent text-text-inverse text-sm font-semibold hover:bg-accent-hover disabled:opacity-40">
                    {csvImporting ? t('common.saving') : t('settings.csvConfirm')}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-warning-light border border-warning rounded-xl p-4 text-xs text-text-secondary">
              ℹ️ {t('settings.cloudNote')}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-nav">
      <h1 className="font-heading text-2xl font-bold text-text mb-4">{t('settings.title')}</h1>

      <div className="bg-surface border border-border rounded-xl p-4 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-accent-dark font-heading text-xl font-bold">
          {user?.displayName?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-text">{user?.displayName}</p>
          <p className="text-xs text-text-muted">{user?.email}</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
        {([
          { key: 'categories', label: t('settings.categories'), sub: t('settings.categoriesDesc', { count: categories.length }) },
          { key: 'members', label: t('settings.members'), sub: t('settings.membersDesc', { count: members.length }) },
          { key: 'recurring', label: t('settings.recurring'), sub: t('settings.recurringDesc', { count: recurring.length }) },
          { key: 'budgets', label: t('settings.budgets'), sub: t('settings.budgetsDesc', { count: budgets.length }) },
          { key: 'templates', label: t('settings.templates'), sub: t('settings.templatesDesc', { count: templates.length }) },
          { key: 'data', label: t('settings.data'), sub: t('settings.dataDesc') },
          { key: 'currency', label: t('currency.title'), sub: `${baseCurrency} · ${CURRENCIES.find(c => c.code === baseCurrency)?.name ?? ''}` },
          { key: 'language', label: t('settings.language'), sub: LANGUAGES.find(l => l.code === i18n.language)?.label ?? '' },
          { key: 'accessibility', label: t('settings.accessibility'), sub: `${t(`settings.font${fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}` as 'settings.fontSm')}${highContrast ? ' · HC' : ''}` },
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

      <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 border border-error rounded-xl text-error text-sm font-medium hover:bg-error-light transition-colors">
        <LogOut size={16} />
        {t('settings.logout')}
      </button>
    </div>
  )
}
