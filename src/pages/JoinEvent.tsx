import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Users } from 'lucide-react'
import { cn } from '../lib/utils'
import { getEventByCode } from '../lib/database'
import Footer from '../components/Footer'
import { APP_CONFIG } from '../constants/config'

const JoinEvent = () =>{
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoinEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (joinCode.trim().length !== APP_CONFIG.CODE_LENGTH) return

    setIsLoading(true)
    setError('')

    try {
      const event = await getEventByCode(joinCode.toUpperCase())
      if (event) {
        navigate(`/event/${joinCode.toUpperCase()}`)
      } else {
        setError(t('join.errorNotFound'))
      }
    } catch {
      setError(t('join.errorNotFound'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-500 rounded-full p-3">
            <Users className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          {t('join.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('join.description', { length: APP_CONFIG.CODE_LENGTH })}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg dark:shadow-gray-900/30 rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleJoinEvent}>
            <div>
              <label htmlFor="event-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('join.codeLabel')}
              </label>
              <div className="mt-1">
                <input
                  id="event-code"
                  name="event-code"
                  type="text"
                  autoComplete="off"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder={t('join.codePlaceholder')}
                  maxLength={APP_CONFIG.CODE_MAX_LENGTH}
                  minLength={APP_CONFIG.CODE_MIN_LENGTH}
                  className={cn(
                    "appearance-none block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-md",
                    "placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100",
                    "text-center text-lg font-mono tracking-widest uppercase",
                    error ? 'border-red-300' : ''
                  )}
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || joinCode.trim().length !== APP_CONFIG.CODE_LENGTH}
                className={cn(
                  "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium",
                  "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                  "disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                )}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('common.loading')}
                  </div>
                ) : (
                  t('join.joinBtn')
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              onClick={() => navigate('/')}
              className={cn(
                "w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium",
                "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                "transition-colors duration-200"
              )}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('event.backToHome')}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default  JoinEvent
