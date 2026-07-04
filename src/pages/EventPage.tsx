import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import type { UserProfile } from '../types/admin'
import { Upload, Camera, Clock, Users, Shield, ArrowLeft, Copy, Check, Music, Image as ImageIcon, Settings, Monitor } from 'lucide-react'
import { cn, formatTimeRemaining, isEventExpired } from '../lib/utils'
import { getThemeClasses, type ThemeId } from '../lib/themes'
import { getEventByCode, getEventPhotos } from '../lib/database'
import { useImageUpload } from '../hooks/useImageUpload'
import { useEventArchive } from '../hooks/useEventArchive'
import { useEventRealtime } from '../hooks/useEventRealtime'
import { useStore } from '../lib/store'
import Carousel from '../components/Carousel'
import TVMode from '../components/TVMode'
import type { Event as EventType, LandingConfig } from '../lib/insforge'
import LandingEditor from '../components/event/LandingEditor'
import { insforge } from '../lib/insforge'
import Footer from '../components/Footer'
import JukeboxPage from './JukeboxPage'
import { useInsforgeRealtime } from '../hooks/useInsforgeRealtime'
import { useAlert } from '../contexts/AlertContext'
import { checkFeature, getBrandingConfig, resolveUserFeatures } from '../lib/subscription'
import type { BrandingConfig } from '../lib/subscription'
import { PhotoCard } from '../components/event/PhotoCard'
import { EventActionButtons } from '../components/event/EventActionButtons'
import { ArchivePrompt } from '../components/event/ArchivePrompt'
// import { ReelPreview } from '../components/event/ReelPreview' // AI reel disabled
import ChallengeCard from '../components/event/ChallengeCard'
import ChallengeCreator from '../components/event/ChallengeCreator'
import ChallengeLeaderboard from '../components/event/ChallengeLeaderboard'
import LiveMessageForm from '../components/event/LiveMessageForm'
import { useChallenges } from '../hooks/useChallenges'

const EventPage = () =>{
  const { t } = useTranslation()
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tvMode = searchParams.get('mode') === 'tv'
  const { showAlert } = useAlert()
  const { photos, setCurrentEvent, setPhotos, setLoading, setError, addPhoto } = useStore()
  const [showChallengeCreator, setShowChallengeCreator] = useState(false)
  
  const [copied, setCopied] = useState(false)
  const [event, setEvent] = useState<EventType | null>(null)
  const [showCarousel, setShowCarousel] = useState(false)
  
  const [showLandingEditor, setShowLandingEditor] = useState(false)
  const [jukeboxActive, setJukeboxActive] = useState(false)
  const [mode, setMode] = useState<'landing' | 'photos' | 'jukebox'>('photos')
  const [isCreatorPro, setIsCreatorPro] = useState(false)
  const [creatorProfile, setCreatorProfile] = useState<UserProfile | null>(null)
  const [branding, setBranding] = useState<BrandingConfig>({ showDJLogo: false, logoUrl: null, djName: null })
  const themeClasses = event ? getThemeClasses(event.theme || 'default') : null
  const { emit } = useInsforgeRealtime(event?.id)
  const { challenges, activeChallenge, setActiveChallenge, loadLeaderboard, leaderboard } = useChallenges(event?.id)

  const loadEventData = useCallback(async () => {
    if (!code) return
    
    setLoading(true)
    try {
      const eventData = await getEventByCode(code.toUpperCase())
      if (eventData) {
        setEvent(eventData)
        setCurrentEvent(eventData)
        
        let proStatus = false
        if (eventData.creator_id && eventData.creator_id !== 'anonymous') {
          const { data: profile } = await insforge.database.from('user_profiles').select('plan_id, full_name, instagram_username').eq('id', eventData.creator_id).single()
          // Use actual feature flag instead of raw plan_id comparison
          const features = await resolveUserFeatures(eventData.creator_id)
          proStatus = features.gallery
          setCreatorProfile(profile as UserProfile)
          // Load white-label branding
          const brandingCfg = await getBrandingConfig(eventData.creator_id)
          setBranding(brandingCfg)
        }
        setIsCreatorPro(proStatus)
        
        const eventPhotos = await getEventPhotos(eventData.id)
        setPhotos(eventPhotos)
        
        const { data: jb } = await insforge.database.from('jukebox_settings').select('*').eq('event_id', eventData.id).single()
        if (jb?.is_active) {
          setJukeboxActive(true)
          setMode(proStatus ? 'landing' : 'jukebox')
        } else {
          setMode('photos')
        }
      } else {
        setError(t('event.notFound'))
        navigate('/')
      }
    } catch {
      setError(t('event.loadError'))
    } finally {
      setLoading(false)
    }
  }, [code, setCurrentEvent, setPhotos, setLoading, setError, navigate])

  useEffect(() => {
    loadEventData()
  }, [loadEventData])

  useEventRealtime(event?.id, () => photos, addPhoto, setPhotos)

  const visiblePhotos = photos.filter((p) => p.status !== 'rejected')
  const { isUploading, handleFileUpload } = useImageUpload({ event, addPhoto, emit, showAlert })
  const {
    isDownloadingZip,
    isDownloadingSelected,
    selectMode,
    selectedIds,
    downloadAllAsZip,
    downloadSelectedZip,
    toggleSelectMode,
    toggleSelectPhoto,
    selectAll,
    clearSelection,
    disableSelectMode
  } = useEventArchive({ event, photos, visiblePhotos, showAlert })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFileUpload(e.dataTransfer.files)
  }

  const copyEventCode = async () => {
    if (event) {
      await navigator.clipboard.writeText(event.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('event.loadingEvent')}</p>
        </div>
      </div>
    )
  }

  const isExpired = isEventExpired(event.expires_at)

  if (tvMode) {
    return <TVMode eventCode={code || ''} onExit={() => navigate(`/event/${code}`, { replace: true })} />
  }

  if (mode === 'landing') {
    const lc = (event.landing_config || {}) as LandingConfig
    const coverUrl = lc.cover_url
    const headline = lc.headline || event.title || t('event.welcomeTo', { code: event.code })
    const subheadline = lc.subheadline || ''
    const showGalleryBtn = lc.show_gallery_button !== false
    const showJukeboxBtn = lc.show_jukebox_button !== false
    const isCreator = false

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${coverUrl ? '' : 'bg-gray-50 dark:bg-gray-900'}`}
        style={coverUrl ? {
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      >
        {coverUrl && <div className="absolute inset-0 bg-black/40" />}
        <div className="relative z-10 text-center max-w-2xl">
          <h1 className="text-3xl font-bold mb-2 text-white">{headline}</h1>
          {subheadline && <p className="text-xl mb-8 text-white/80">{subheadline}</p>}
          {!coverUrl && <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{headline}</h1>}
          {!coverUrl && subheadline && <p className="text-xl mb-8 text-gray-600 dark:text-gray-400">{subheadline}</p>}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mt-8">
            {showGalleryBtn && (
              <button 
                onClick={() => setMode('photos')}
                className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-blue-500"
              >
                <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-full mb-4">
                  <ImageIcon className="h-12 w-12 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('event.photoGallery')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">{t('event.photoGalleryDesc')}</p>
              </button>
            )}

            {showJukeboxBtn && (
              <button 
                onClick={() => setMode('jukebox')}
                className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-green-500"
              >
                <div className="bg-green-100 dark:bg-green-900/50 p-4 rounded-full mb-4">
                  <Music className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('event.interactivePlaylist')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">{t('event.interactivePlaylistDesc')}</p>
              </button>
            )}
          </div>

          <button onClick={() => navigate('/')} className="mt-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline">
            {t('event.backToHome')}
          </button>
        </div>

        {event.creator_id && (
          <button
            onClick={() => setShowLandingEditor(true)}
            className="absolute top-4 right-4 z-20 p-2 bg-white/80 dark:bg-gray-800/80 rounded-full shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
          >
            <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}

        {showLandingEditor && (
          <LandingEditor
            eventId={event.id}
            config={event.landing_config || {}}
            onSaved={(cfg) => {
              setEvent({ ...event, landing_config: cfg })
              setShowLandingEditor(false)
            }}
            onClose={() => setShowLandingEditor(false)}
          />
        )}
      </div>
    )
  }

  if (mode === 'jukebox') {
      return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
             <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 p-4 flex items-center">
                 {isCreatorPro && (
                   <>
                      <button onClick={() => setMode('landing')} className="mr-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                         <ArrowLeft className="h-6 w-6" />
                     </button>
                      <h1 className="text-xl font-bold">{t('event.backToMenu')}</h1>
                    </>
                  )}
                  {!isCreatorPro && (
                    <>
                      <button onClick={() => navigate('/')} className="mr-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                          <ArrowLeft className="h-6 w-6" />
                      </button>
                      <h1 className="text-xl font-bold">{t('event.backToHome')}</h1>
                   </>
                 )}
             </div>
             <JukeboxPage event={event} creatorProfile={creatorProfile} />
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => (jukeboxActive && isCreatorPro) ? setMode('landing') : navigate('/')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {(jukeboxActive && isCreatorPro) ? t('event.backToMenu') : t('event.backToHome')}
            </button>
            
            <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap">
              <div className="hidden sm:flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4 mr-1" />
                {formatTimeRemaining(event.expires_at)}
              </div>
              
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4 mr-1" />
                {visiblePhotos.length} fotos
              </div>
            
            {event.moderation_enabled && (
              <div className="hidden sm:flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-4 w-4 mr-1" />
                {t('event.withModeration')}
              </div>
            )}

            <EventActionButtons
              event={event}
              visiblePhotosCount={visiblePhotos.length}
              selectMode={selectMode}
              selectedIdsCount={selectedIds.size}
              isDownloadingZip={isDownloadingZip}
              isDownloadingSelected={isDownloadingSelected}
              onNavigateModerate={() => navigate(`/moderate/${code}`)}
              onDownloadAllAsZip={downloadAllAsZip}
              onToggleSelectMode={toggleSelectMode}
              onDownloadSelectedZip={downloadSelectedZip}
              onSelectAll={selectAll}
              onDisableSelectMode={disableSelectMode}
            />
            {visiblePhotos.length > 0 && (
              <button
                onClick={() => navigate(`/event/${code}?mode=tv`)}
                className="flex items-center px-3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                title={t('event.tvMode')}
              >
                <Monitor className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{t('event.tvMode')}</span>
              </button>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Code Banner */}
      <div className={themeClasses?.banner || 'bg-blue-600 text-white'}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              {/* White-label branding: show DJ logo if enabled, otherwise EventSnaps logo */}
              {branding.showDJLogo && branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.djName ?? 'DJ Logo'}
                  className="h-10 w-auto object-contain rounded"
                />
              ) : (
                <span className="text-lg font-extrabold tracking-tight">EventSnaps</span>
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('event.eventCode')}</h1>
              <p className="text-white/80 text-sm">{t('event.shareCode')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl sm:text-3xl font-mono font-bold ${themeClasses?.bannerButton || 'bg-blue-700'} px-3 sm:px-4 py-2 rounded-lg`}>
                {event.code}
              </span>
              <button
                onClick={copyEventCode}
                className={`flex items-center px-3 py-2.5 ${themeClasses?.bannerButton || 'bg-blue-700 hover:bg-blue-800'} rounded-lg transition-colors`}
              >
                {copied ? (
                  <><Check className="h-4 w-4 mr-1" /> {t('event.copied')}</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> {t('event.copy')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Archive Prompt */}
        {isExpired && event.creator_id && (
          <div className="mb-6">
            <ArchivePrompt
              eventId={event.id}
              expiresAt={event.expires_at}
              isCreator={true}
              archived={event.archived || false}
            />
          </div>
        )}

        {/* Reel Preview (creator only) - AI DISABLED
        {isExpired && isCreatorPro && (
          <div className="mb-6">
            <ReelPreview eventId={event.id} isCreator={true} />
          </div>
        )}
        */}

        {/* Photo Challenges */}
        {challenges.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Retos</h3>
              {isCreatorPro && (
                <button onClick={() => setShowChallengeCreator(true)} className="text-sm text-yellow-600 hover:text-yellow-700">+ Crear reto</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {challenges.map(c => (
                <ChallengeCard key={c.id} challenge={c} isActive={activeChallenge?.id === c.id} onSelect={() => setActiveChallenge(c)} />
              ))}
            </div>
            {activeChallenge && (
              <div className="mt-4">
                <ChallengeLeaderboard challengeId={activeChallenge.id} />
              </div>
            )}
          </div>
        )}

        {showChallengeCreator && event && (
          <ChallengeCreator eventId={event.id} onCreated={() => {}} onClose={() => setShowChallengeCreator(false)} />
        )}

        {showCarousel && (
          <div className="fixed inset-0 z-50">
            <Carousel photos={photos} onClose={() => setShowCarousel(false)} />
          </div>
        )}
        {/* Upload Section */}
        {!isExpired && (
          <div className="mb-8">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t('event.uploadPhotos')}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('event.dragAndDrop')}
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className={cn(
                  "inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md",
                  `text-white ${themeClasses?.button || 'bg-blue-600 hover:bg-blue-700'} cursor-pointer`,
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                  "transition-colors duration-200",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isUploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('event.uploading')}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Camera className="h-5 w-5 mr-2" />
                    {t('event.selecting')}
                  </div>
                )}
              </label>
            </div>
            {event.moderation_enabled && (
              <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                {t('event.underModeration')}
              </div>
            )}
          </div>
        )}

        {/* Photos Grid */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {photos.length === 0 ? t('event.noPhotosYet') : `Fotos compartidas (${photos.length})`}
          </h2>
          {photos.length === 0 && !isExpired && (
            <p className="text-gray-600 dark:text-gray-400">{t('event.beFirst')}</p>
          )}
          {isExpired && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800">{t('event.eventExpired')}</p>
            </div>
          )}
        </div>

        {visiblePhotos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visiblePhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                selectionEnabled={selectMode}
                selected={selectedIds.has(photo.id)}
                onToggleSelect={() => toggleSelectPhoto(photo.id)}
                eventId={event.id}
                eventTheme={event.theme}
              />
            ))}
          </div>
        )}
      </div>

      {/* Live Wall Message Form */}
      {!isExpired && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <LiveMessageForm eventId={event.id} />
        </div>
      )}

      <Footer />
    </div>
  )
}

export default EventPage
