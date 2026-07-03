import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, Home, Plus, User, LogIn, LogOut, LayoutDashboard, Crown, Sun, Moon } from 'lucide-react'
import { cn } from '../lib/utils'
import { insforge } from '../lib/insforge'
import { ROUTES } from '../constants/routes'
import LanguageSwitcher from './LanguageSwitcher'
import { useTheme } from '../contexts/ThemeContext'

const Navigation = () =>{
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [session, setSession] = useState<{ user: { email?: string } } | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await insforge.auth.getCurrentSession()
        setSession(data.session)
      } catch {
        // failed to get current session
      }
    }
    checkSession()
  }, [])

  const handleLogout = async () => {
    await insforge.auth.signOut()
    window.location.href = ROUTES.HOME
  }

  const navItems = [
    { name: t('nav.home'), href: ROUTES.HOME, icon: Home, showAlways: true },
    { name: t('nav.createEvent'), href: ROUTES.CREATE_EVENT, icon: Plus, requiresAuth: true },
    { name: t('nav.joinEvent'), href: ROUTES.JOIN_EVENT, icon: User, showAlways: true },
    { name: t('nav.plans'), href: ROUTES.PRICING, icon: Crown, showAlways: true },
    { name: t('nav.myProfile'), href: ROUTES.PROFILE, icon: User, requiresAuth: true },
    { name: t('nav.dashboard'), href: ROUTES.ADMIN_DASHBOARD, icon: LayoutDashboard, requiresAuth: true },
  ]

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => navigate(ROUTES.HOME)}
              className="flex items-center text-xl font-bold text-blue-600 hover:text-blue-700"
            >
              EventSnaps
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.filter(item => item.showAlways || (item.requiresAuth && session)).map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </button>
              )
            })}
            
            <LanguageSwitcher />

            <button
              onClick={toggleTheme}
              className="flex items-center text-gray-700 hover:text-blue-600 px-2 py-2 rounded-md text-sm font-medium transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {session ? (
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('nav.logout')}
              </button>
            ) : (
              <button
                onClick={() => navigate(ROUTES.AUTH)}
                className="flex items-center text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {t('nav.login')}
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={cn("md:hidden", isMenuOpen ? "block" : "hidden")}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
          {navItems.filter(item => item.showAlways || (item.requiresAuth && session)).map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.href)
                  setIsMenuOpen(false)
                }}
                className="flex items-center w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.name}
              </button>
            )
          })}
          {session ? (
            <button
              onClick={() => {
                handleLogout()
                setIsMenuOpen(false)
              }}
              className="flex items-center w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              {t('nav.logout')}
            </button>
          ) : (
            <button
              onClick={() => {
                navigate(ROUTES.AUTH)
                setIsMenuOpen(false)
              }}
              className="flex items-center w-full text-left px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <LogIn className="h-5 w-5 mr-3" />
              {t('nav.login')}
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navigation