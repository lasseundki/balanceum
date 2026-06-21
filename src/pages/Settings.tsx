import { useState } from 'react'
import { X, Download, LogOut, ChevronRight, Check, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  useCategories, useCategoryActions,
  useMembers, useMemberActions,
  useRecurringTransactions, useRecurringActions,
  usePaymentMethods, useMembers as useAllMembers,
} from '../hooks/useFirestore'
import { useAuth } from '../contexts/AuthContext'
import { useAccessibility } from '../contexts/AccessibilityContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { CURRENCIES } from '../lib/currency'
import { exportCSV, exportJSON } from '../lib/export'
import { fmt } from '../lib/formatters'
import type { CategoryType, TransactionType, Frequency } from '../types'

type Section = 'main' | 'categories' | 'members' | 'recurring' | 'data' | 'language' | 'accessibility' | 'currency'

const CAT_ICONS = ['🏠','🛒','🚗','💊','🎉','🍽️','👕','📚','✈️','💻','🧹','📋','💼','💰','📈','📌','🎁','🏥','🏋️','🎵','📱','🌿','🐾','🎓','💡']

const LANGUAGES = [
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
]

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
  const { addRecurring, deleteRecurring } = useRecurringActions()
  const paymentMethods = usePaymentMethods()
  const allMembers = useAllMembers()

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
                  <button
                    onClick={() => changeLanguage(lang.code)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-bg-subtle transition-colors"
                  >
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

            {/* Font Size */}
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-text">{t('settings.fontSize')}</p>
              <div className="flex gap-2">
                {(['sm', 'md', 'lg'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      fontSize === size ? 'bg-accent text-text-inverse border-accent' : 'border-border text-text-secondary hover:bg-bg-subtle'
                    }`}
                  >
                    {size === 'sm' ? t('settings.fontSm') : size === 'md' ? t('settings.fontMd') : t('settings.fontLg')}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">{t('settings.highContrast')}</p>
                  <p className="text-xs text-text-muted mt-0.5">{t('settings.highContrastDesc')}</p>
                </div>
                <button
                  onClick={() => setHighContrast(!highContrast)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${highContrast ? 'bg-accent' : 'bg-bg-muted'}`}
                >
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
                  <button
                    onClick={() => setBaseCurrency(c.code)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-subtle transition-colors"
                  >
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
                <div className="flex flex-wrap gap-2">
                  {CAT_ICONS.map(ic => (
                    <button key={ic} onClick={() => setCatIcon(ic)} className={`text-xl p-1.5 rounded-md ${catIcon === ic ? 'bg-accent-light ring-2 ring-accent' : 'hover:bg-bg-muted'}`}>{ic}</button>
                  ))}
                </div>
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
                      <div className="flex flex-wrap gap-2">
                        {CAT_ICONS.map(ic => (
                          <button key={ic} onClick={() => setEditCatIcon(ic)} className={`text-xl p-1.5 rounded-md ${editCatIcon === ic ? 'bg-accent-light ring-2 ring-accent' : 'hover:bg-bg-muted'}`}>{ic}</button>
                        ))}
                      </div>
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
                  <div key={r.id} className="flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3">
                    <span className="text-xl">{cat?.icon ?? '📌'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">{r.note || cat?.name || t('transaction.unknown')}</p>
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
            </div>

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
          { key: 'categories', label: t('settings.categories'), sub: t('settings.categoriesDesc', { count: categories.length }) },
          { key: 'members', label: t('settings.members'), sub: t('settings.membersDesc', { count: members.length }) },
          { key: 'recurring', label: t('settings.recurring'), sub: t('settings.recurringDesc', { count: recurring.length }) },
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

      {/* Logout */}
      <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 border border-error rounded-xl text-error text-sm font-medium hover:bg-error-light transition-colors">
        <LogOut size={16} />
        {t('settings.logout')}
      </button>
    </div>
  )
}
