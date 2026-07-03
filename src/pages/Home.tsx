import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Camera, Users, Clock, Zap } from 'lucide-react'
import { cn } from '../lib/utils'
import Footer from '../components/Footer'
import { insforge } from '../lib/insforge'
import { APP_CONFIG } from '../constants/config'

const Home = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [session, setSession] = useState<{ user: { email: string } } | null>(null)

  useEffect(() => {
    insforge.auth.getCurrentSession().then(({ data }) => {
      setSession(data.session)
    }).catch(console.error)
  }, [])

  const handleJoinEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (joinCode.trim().length === APP_CONFIG.CODE_LENGTH) {
      navigate(`/event/${joinCode.toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 dark:from-gray-900 to-indigo-100 dark:to-gray-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-transparent sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="text-center">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
                  <span className="block">{t('home.title')}</span>
                  <span className="block text-blue-600">{t('home.subtitle')}</span>
                </h1>
                <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                  {t('home.description')}
                </p>
                
                {/* Features */}
                <div className="mt-10">
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="pt-6">
                      <div className="flow-root bg-white dark:bg-gray-800 rounded-lg px-6 pb-8">
                        <div className="-mt-6">
                          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg dark:shadow-gray-900/30">
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-gray-100 tracking-tight">{t('home.easyUpload')}</h3>
                          <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                            {t('home.easyUploadDesc')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6">
                      <div className="flow-root bg-white dark:bg-gray-800 rounded-lg px-6 pb-8">
                        <div className="-mt-6">
                          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg dark:shadow-gray-900/30">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-gray-100 tracking-tight">{t('home.privateShare')}</h3>
                          <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                            {t('home.privateShareDesc')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6">
                      <div className="flow-root bg-white dark:bg-gray-800 rounded-lg px-6 pb-8">
                        <div className="-mt-6">
                          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg dark:shadow-gray-900/30">
                            <Clock className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-gray-100 tracking-tight">{t('home.timeLimit')}</h3>
                          <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                            {t('home.timeLimitDesc')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6">
                      <div className="flow-root bg-white dark:bg-gray-800 rounded-lg px-6 pb-8">
                        <div className="-mt-6">
                          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg dark:shadow-gray-900/30">
                            <Zap className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-gray-100 tracking-tight">{t('home.aiModeration')}</h3>
                          <p className="mt-5 text-base text-gray-500 dark:text-gray-400">
                            {t('home.aiModerationDesc')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
      {/* Action Section */}
      <div className="bg-white dark:bg-gray-800 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">
              {t('home.readyToStart')}
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
              {t('home.createOrJoin')}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {/* Create Event */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-6 py-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('home.createNewEvent')}</h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {t('home.createNewEventDesc')}
              </p>
              <button
                onClick={() => navigate(session ? '/create' : '/auth')}
                className={cn(
                  "mt-6 w-full inline-flex items-center justify-center px-6 py-3",
                  "border border-transparent text-base font-medium rounded-md",
                  "text-white bg-blue-600 hover:bg-blue-700",
                  "transition-colors duration-200"
                )}
              >
                {session ? t('home.createEvent') : t('home.loginToCreate')}
              </button>
            </div>

            {/* Join Event */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-6 py-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('home.joinEvent')}</h3>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {t('home.joinEventDesc')}
              </p>
              <form onSubmit={handleJoinEvent} className="mt-6">
                <div>
                  <label htmlFor="event-code" className="sr-only">
                    {t('home.eventCode')}
                  </label>
                  <input
                    type="text"
                    id="event-code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder={t('home.eventCodePlaceholder', { length: APP_CONFIG.CODE_LENGTH })}
                    maxLength={APP_CONFIG.CODE_MAX_LENGTH}
                    minLength={APP_CONFIG.CODE_MIN_LENGTH}
                    required
                    className={cn(
                      "block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md",
                      "placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500",
                      "text-center text-lg font-mono tracking-wider dark:bg-gray-700 dark:text-gray-100"
                    )}
                  />
                </div>
                <button
                  type="submit"
                  disabled={joinCode.trim().length !== APP_CONFIG.CODE_LENGTH}
                  className={cn(
                    "mt-4 w-full inline-flex items-center justify-center px-6 py-3",
                    "border border-transparent text-base font-medium rounded-md",
                    "text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600",
                    "transition-colors duration-200"
                  )}
                >
                  {t('home.joinEventBtn')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Home