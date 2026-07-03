import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { insforge } from '../lib/insforge'
import { useNavigate } from 'react-router-dom'
import { User, Instagram, Save, ChevronLeft, CalendarDays, ExternalLink, Trash2, Image as ImageIcon, Crown } from 'lucide-react'
import { useAlert } from '../contexts/AlertContext'
import { resolveUserFeatures } from '../lib/subscription'

import type { UserProfile, AdminEvent } from '../types/admin'

export default function ProfilePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { showAlert, showConfirm } = useAlert()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  const [fullName, setFullName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [customLogoUrl, setCustomLogoUrl] = useState('')
  const [whiteLabelAllowed, setWhiteLabelAllowed] = useState(false)
  const [locale, setLocale] = useState('es')
  const [themePreference, setThemePreference] = useState('default')
  const [userEvents, setUserEvents] = useState<AdminEvent[]>([])

  const loadProfile = useCallback(async () => {
    try {
      const { data: sessionData } = await insforge.auth.getCurrentSession()
      if (!sessionData?.session) {
        navigate('/auth')
        return
      }

      const { data } = await insforge.database
        .from('user_profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single()
      
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setInstagram(data.instagram_username || '')
        setCustomLogoUrl(data.custom_logo_url || '')
        setLocale(data.locale || 'es')
        setThemePreference(data.theme_preference || 'default')
        // Check if user has white_label feature
        const features = await resolveUserFeatures(sessionData.session.user.id)
        setWhiteLabelAllowed(features.white_label)
      }

      // Load user events
      const { data: eventsData } = await insforge.database
        .from('events')
        .select('*')
        .eq('creator_id', sessionData.session.user.id)
        .order('created_at', { ascending: false })
      
      if (eventsData) {
        setUserEvents(eventsData)
      }
    } catch {
      // failed to load plans
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (!profile) return
      const { error } = await insforge.database
        .from('user_profiles')
        .update({
          full_name: fullName,
          instagram_username: instagram.replace('@', ''),
          custom_logo_url: customLogoUrl.trim() || null,
          locale,
          theme_preference: themePreference
        })
        .eq('id', profile.id)
        
      if (error) throw error
      showAlert(t('profile.saved'))
    } catch (err: unknown) {
         console.error(err)
      if (err instanceof Error) {
        showAlert(err.message || t('profile.errorSave'), t('common.error'))
      } else {
        showAlert(t('profile.errorSave'), t('common.error'))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async (eventId: string, eventCode: string) => {
    const confirmed = await showConfirm(`${t('profile.deleteConfirm')}`)
    if (!confirmed) return

    try {
      const { error } = await insforge.database
        .from('events')
        .delete()
        .eq('id', eventId)
      
      if (error) throw error
      
      setUserEvents(prev => prev.filter(e => e.id !== eventId))
      showAlert(t('profile.deleteSuccess'))
    } catch (err: unknown) {
      if (err instanceof Error) {
        showAlert(err.message || t('profile.deleteError'), t('common.error'))
      } else {
        showAlert(t('profile.deleteError'), t('common.error'))
      }
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-8">
        <div className="flex items-center mb-6">
           <button onClick={() => navigate('/')} className="mr-3 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
               <ChevronLeft className="h-6 w-6" />
           </button>
           <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
             <User className="mr-2 text-blue-600 h-6 w-6" />
             {t('profile.title')}
           </h2>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.fullName')}</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-3 sm:text-sm border-gray-300 rounded-md py-2 border outline-none"
                placeholder="Ej. Jorge Quintero"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('profile.fullNameDesc')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('profile.instagram')}</label>
            <div className="mt-1 relative rounded-md shadow-sm flex items-center">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 sm:text-sm h-full py-2">
                <Instagram className="h-4 w-4 mr-1"/> @
              </span>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 dark:border-gray-600 py-2 border outline-none px-3 dark:bg-gray-700 dark:text-gray-100"
                placeholder="usuario"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('profile.instagramDesc')}</p>
          </div>

          {/* Language preference */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.language')}
            </label>
            <select
              value={locale}
              onChange={(e) => { setLocale(e.target.value); i18n.changeLanguage(e.target.value) }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
              <option value="fr">Français</option>
            </select>
          </div>

          {/* Theme preference */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('profile.themePreference')}
            </label>
            <select
              value={themePreference}
              onChange={(e) => setThemePreference(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="default">{t('themes.default')}</option>
              <option value="wedding">{t('themes.wedding')}</option>
              <option value="birthday">{t('themes.birthday')}</option>
              <option value="concert">{t('themes.concert')}</option>
              <option value="corporate">{t('themes.corporate')}</option>
            </select>
          </div>

          {/* White-label Logo (Pro only) */}
          {whiteLabelAllowed && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Crown className="h-4 w-4 text-amber-500" />
                {t('profile.customLogo')}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="url"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-3 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md py-2 border outline-none dark:bg-gray-700 dark:text-gray-100"
                  placeholder="https://mi-dominio.com/mi-logo.png"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('profile.customLogoDesc')}
              </p>
              {/* Live preview */}
              {customLogoUrl && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
                  <ImageIcon className="h-5 w-5 text-gray-400 shrink-0" />
                  <img
                    src={customLogoUrl}
                    alt="Vista previa del logo"
                    className="h-10 w-auto max-w-[160px] object-contain rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block' }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('profile.logoPreview')}</span>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 space-y-1">
             <p><strong>{t('profile.email')}:</strong> {profile?.email}</p>
             <p><strong>{t('profile.currentPlan')}:</strong> <span className="uppercase font-semibold text-blue-600">{profile?.plan_id}</span></p>
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
            >
              {saving ? t('common.saving') : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  {t('profile.saveBtn')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="max-w-md mx-auto mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center mb-6">
           <CalendarDays className="mr-2 text-blue-600 h-6 w-6" />
{t('profile.myEvents')}
         </h2>

        {userEvents.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">{t('profile.noEvents')}</p>
        ) : (
          <div className="space-y-4">
            {userEvents.map(event => {
              const isActive = new Date(event.expires_at) > new Date()
              return (
                <div key={event.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{event.code}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Creado: {new Date(event.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isActive ? t('admin.active') : t('profile.expired')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => navigate(`/event/${event.code}`)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1"/> Ir al evento
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id, event.code)}
                      className="text-sm font-medium text-red-600 hover:text-red-800 flex items-center p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
                      title="Eliminar evento"
                    >
                      <Trash2 className="h-4 w-4"/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
