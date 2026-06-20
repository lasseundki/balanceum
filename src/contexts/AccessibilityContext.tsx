import { createContext, useContext, useEffect, useState } from 'react'

type FontSize = 'sm' | 'md' | 'lg'

interface AccessibilityContextType {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  highContrast: boolean
  setHighContrast: (on: boolean) => void
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

const FONT_CLASSES: Record<FontSize, string> = {
  sm: 'text-sm-scale',
  md: '',
  lg: 'text-lg-scale',
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(
    () => (localStorage.getItem('balanceum_fontSize') as FontSize) || 'md'
  )
  const [highContrast, setHighContrastState] = useState(
    () => localStorage.getItem('balanceum_highContrast') === 'true'
  )

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('text-sm-scale', 'text-lg-scale')
    const cls = FONT_CLASSES[fontSize]
    if (cls) html.classList.add(cls)
  }, [fontSize])

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast)
  }, [highContrast])

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
    localStorage.setItem('balanceum_fontSize', size)
  }

  const setHighContrast = (on: boolean) => {
    setHighContrastState(on)
    localStorage.setItem('balanceum_highContrast', String(on))
  }

  return (
    <AccessibilityContext.Provider value={{ fontSize, setFontSize, highContrast, setHighContrast }}>
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}
