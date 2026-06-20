import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import pt from './locales/pt.json'

const savedLang = localStorage.getItem('balanceum_lang') || 'de'

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
    es: { translation: es },
    pt: { translation: pt },
  },
  lng: savedLang,
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
})

export default i18n
