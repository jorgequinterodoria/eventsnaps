import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, Shield, CheckCircle, Crown } from 'lucide-react'
import { cn } from '../lib/utils'
import { createEvent } from '../lib/database'
import QRCode from '../components/QRCode'
import Footer from '../components/Footer'
import { insforge } from '../lib/insforge'
import { ROUTES } from '../constants/routes'
import { useAlert } from '../contexts/AlertContext'
import { checkFeature, resolveUserFeatures } from '../lib/subscription'
import type { UserProfile } from '../types/admin'
import { THEMES, type ThemeId } from '../lib/themes'

const CreateEvent = () =>{
  const navigate = useNavigate()
  const { showAlert } = useAlert()
  const { t } = useTranslation()
  const [duration, setDuration] = useState<'24h' | '72h'>('24h')
  const [moderationEnabled, setModerationEnabled] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('default')
  const [eventTitle, setEventTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [createdCode, setCreatedCode] = useState<string>('')
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [galleryAllowed, setGalleryAllowed] = useState(false)
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await insforge.auth.getCurrentSession()
      if (data?.session?.user) {
        const userId = data.session.user.id
        const { data: profile } = await insforge.database
          .from('user_profiles')
          .select('plan_id')
          .eq('id', userId)
          .single()
        
        if (profile) {
          setUserProfile({ id: userId, plan_id: profile.plan_id, email: data.session.user.email || '', role: 'user', status: 'active', created_at: new Date().toISOString() })
        } else {
          setUserProfile({ id: userId, plan_id: null, email: data.session.user.email || '', role: 'user', status: 'active', created_at: new Date().toISOString() }) // Default if no profile found
        }

        // Resolve actual feature access (subscription → profile fallback)
        const features = await resolveUserFeatures(userId)
        setGalleryAllowed(features.gallery)
      }
    }
    fetchUser()
  }, [])

  const handleCreateEvent = async () => {
    setIsCreating(true)
    try {
      const creatorId = userProfile ? userProfile.id : 'anonymous'

      // Gate: only users with gallery feature can enable moderation
      let finalModeration = false
      if (moderationEnabled && userProfile?.id) {
        const result = await checkFeature(userProfile.id, 'gallery')
        finalModeration = result.allowed ? moderationEnabled : false
      }

      const event = await createEvent(duration, finalModeration, creatorId, selectedTheme, eventTitle)
      setCreatedCode(event.code)
      setShowQR(true)
    } catch {
      showAlert(t('create.errorCreate'), t('common.error'))
    } finally {
      setIsCreating(false)
    }
  }

  const isPro = galleryAllowed

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{t('create.title')}</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isPro ? t('create.configEvent') : t('create.configJukebox')}
          </p>
        </div>

        {!userProfile && (
           <div className="mt-4 bg-blue-50 text-blue-700 p-3 rounded-md text-sm text-center">
               {t('create.loginPrompt')}
           </div>
        )}

        <div className="mt-6 bg-white dark:bg-gray-800 py-8 px-6 shadow-lg dark:shadow-gray-900/30 rounded-lg sm:px-10">
          {/* Duration Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('create.duration')}
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setDuration('24h')}
                className={cn(
                  "relative rounded-lg border-2 p-4 flex flex-col items-center justify-center",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  duration === '24h' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400'
                )}
              >
                <Clock className="h-6 w-6 mb-2 text-blue-600" />
                <span className="text-sm font-medium">{t('create.duration24h')}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Perfecto para fiestas</span>
              </button>
              
              <button
                type="button"
                onClick={() => setDuration('72h')}
                className={cn(
                  "relative rounded-lg border-2 p-4 flex flex-col items-center justify-center",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  duration === '72h' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400'
                )}
              >
                <Clock className="h-6 w-6 mb-2 text-blue-600" />
                <span className="text-sm font-medium">{t('create.duration72h')}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ideal para bodas</span>
              </button>
            </div>
          </div>

          {/* Event Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('event.eventTitle', 'Nombre del Evento')}
            </label>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder={t('event.titlePlaceholder', 'Ej: Boda María & Carlos')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Moderation Toggle (Only Pro) */}
          {isPro ? (
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-blue-600 mr-2" />
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('create.moderation')}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setModerationEnabled(!moderationEnabled)}
                  className={cn(
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    moderationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      moderationEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('create.moderationDesc')}
              </p>
            </div>
          ) : (
            <div className="mb-8 bg-gradient-to-r from-amber-50 dark:from-amber-900/20 to-orange-50 dark:to-orange-900/20 border border-amber-200 rounded-lg p-4 flex items-start">
              <Crown className="h-5 w-5 text-amber-500 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800">{t('create.upgradePro')}</h4>
                <p className="mt-1 text-sm text-amber-700">
                   {t('create.planUpsell')}
                </p>
              </div>
            </div>
          )}

          {/* Theme Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('create.theme')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('create.themeDesc')}</p>
            <div className="grid grid-cols-5 gap-2">
              {(Object.values(THEMES) as Array<{ id: ThemeId; icon: string; preview: { bg: string } }>).map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all",
                    selectedTheme === theme.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  )}
                  title={t(`themes.${theme.id}` as any)}
                >
                  <div
                    className="w-8 h-8 rounded-full mb-1"
                    style={{ backgroundColor: theme.preview.bg }}
                  />
                  <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-full text-center">
                    {t(`themes.${theme.id}` as any)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateEvent}
            disabled={isCreating}
            className={cn(
              "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium",
              "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              "disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            )}
          >
            {isCreating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('common.loading')}
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                {t('create.createBtn')}
              </div>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            {t('common.back')}
          </button>
        </div>

        {showQR && (
          <div className="mt-8 bg-white dark:bg-gray-800 py-8 px-6 shadow-lg dark:shadow-gray-900/30 rounded-lg sm:px-10">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('create.shareTitle')}</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('create.shareDesc')}</p>
            </div>
            <div className="flex items-center justify-center">
              <QRCode url={`https://tusfotosevento.netlify.app/event/${createdCode}`} size={256} caption={`Código: ${createdCode}`} />
            </div>
            <div className="mt-3 text-center">
              <a
                href={`https://tusfotosevento.netlify.app/event/${createdCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                https://tusfotosevento.netlify.app/event/{createdCode}
              </a>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => navigate(`/event/${createdCode}`)}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                {t('create.goToEvent')}
              </button>
              <button
                onClick={() => setShowQR(false)}
                className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default CreateEvent
