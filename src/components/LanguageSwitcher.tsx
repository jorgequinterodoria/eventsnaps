import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { useEffect } from 'react'

const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const saved = localStorage.getItem('i18nextLng')
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      i18n.changeLanguage(saved)
    }
  }, [i18n])

  return (
    <div className="relative group">
      <button
        className="flex items-center text-gray-700 hover:text-blue-600 px-2 py-2 rounded-md text-sm font-medium transition-colors"
        title="Language"
      >
        <Languages className="h-4 w-4" />
      </button>
      <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
              i18n.language === lang.code ? 'text-blue-600 font-medium' : 'text-gray-700'
            }`}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}
