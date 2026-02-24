import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, Home, Plus, User, LogIn, LogOut, LayoutDashboard, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { insforge } from '@/lib/insforge'

const Navigation = () =>{
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    insforge.auth.getCurrentSession().then(({ data }) => {
      setSession(data.session)
    }).catch(console.error)
  }, [])

  const handleLogout = async () => {
    await insforge.auth.signOut()
    window.location.href = '/'
  }

  const navItems = [
    { name: 'Inicio', href: '/', icon: Home, showAlways: true },
    { name: 'Crear Evento', href: '/create', icon: Plus, requiresAuth: true },
    { name: 'Unirse a Evento', href: '/join', icon: User, showAlways: true },
    { name: 'Planes', href: '/pricing', icon: Crown, showAlways: true },
    { name: 'Mi Perfil', href: '/profile', icon: User, requiresAuth: true },
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, requiresAuth: true },
  ]

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
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
            
            {session ? (
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </button>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="flex items-center text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Ingresar
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
              Salir
            </button>
          ) : (
            <button
              onClick={() => {
                navigate('/auth')
                setIsMenuOpen(false)
              }}
              className="flex items-center w-full text-left px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <LogIn className="h-5 w-5 mr-3" />
              Ingresar
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navigation