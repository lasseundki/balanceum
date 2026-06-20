import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, PlusCircle, BarChart2, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  onAdd: () => void
}

export default function BottomNav({ onAdd }: Props) {
  const { t } = useTranslation()

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-0.5 py-2 px-3 text-xs font-medium transition-colors ${
      isActive ? 'text-accent' : 'text-text-muted'
    }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border safe-bottom z-40">
      <div className="flex items-end justify-around max-w-lg mx-auto">
        <NavLink to="/" end className={link}>
          <LayoutDashboard size={22} />
          <span>{t('nav.home')}</span>
        </NavLink>
        <NavLink to="/transactions" className={link}>
          <List size={22} />
          <span>{t('nav.list')}</span>
        </NavLink>

        <button
          onClick={onAdd}
          className="flex flex-col items-center -mt-5 focus:outline-none"
        >
          <div className="w-14 h-14 rounded-full bg-accent shadow-lg flex items-center justify-center text-text-inverse hover:bg-accent-hover transition-colors">
            <PlusCircle size={28} />
          </div>
        </button>

        <NavLink to="/analytics" className={link}>
          <BarChart2 size={22} />
          <span>{t('nav.analytics')}</span>
        </NavLink>
        <NavLink to="/settings" className={link}>
          <Settings size={22} />
          <span>{t('nav.settings')}</span>
        </NavLink>
      </div>
    </nav>
  )
}
