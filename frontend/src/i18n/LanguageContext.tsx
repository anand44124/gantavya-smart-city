import React, { createContext, useContext, useEffect, useState } from 'react'
import { LANGUAGES, translations, type LanguageCode, type LanguageMeta } from './translations'

interface LanguageContextValue {
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  currentMeta: LanguageMeta
  t: (key: string, defaultText?: string) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('civicpulse_lang') as LanguageCode
    return LANGUAGES.some((l) => l.code === saved) ? saved : 'en'
  })

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang)
    localStorage.setItem('civicpulse_lang', lang)
    document.documentElement.lang = lang
  }

  const currentMeta = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[language] || translations.en
    if (langDict && langDict[key]) {
      return langDict[key]
    }
    const enDict = translations.en
    if (enDict && enDict[key]) {
      return enDict[key]
    }
    return defaultText || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, currentMeta, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useTranslation = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}
