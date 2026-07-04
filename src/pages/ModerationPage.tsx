import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react'
import { getEventByCode, getModerationQueue, moderatePhoto, setModerationAISuggestion } from '../lib/database'
import { analyzePhotoForModeration } from '../lib/gemini'
import type { Event as EventType } from '../lib/insforge'
import Footer from '../components/Footer'
import { useAlert } from '../contexts/AlertContext'
import { insforge } from '../lib/insforge'
import { ModerationCard } from '../components/moderation/ModerationCard'

const AUTO_APPROVE_THRESHOLD = 0.9

const ModerationPage = () => {
  const { t } = useTranslation()
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { showAlert } = useAlert()
  const [event, setEvent] = useState<EventType | null>(null)
  const [queue, setQueue] = useState<import('../lib/database').ModerationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadModerationData = useCallback(async () => {
    if (!code) return

    try {
      // ── Auth guard ──────────────────────────────────────────────────────────
      const { data: sessionData } = await insforge.auth.getCurrentUser()
      if (!sessionData?.user) {
        showAlert(t('moderation.loginRequired'), t('moderation.noAccess'))
        navigate('/auth')
        return
      }
      const userId = sessionData.user.id
      setCurrentUserId(userId)

      const eventData = await getEventByCode(code.toUpperCase())
      if (!eventData) {
        navigate('/')
        return
      }

      // Only event creator or admin can moderate
      const { data: profile } = await insforge.database
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single()

      const isCreator = eventData.creator_id === userId
      const isAdmin   = profile?.role === 'admin'

      if (!isCreator && !isAdmin) {
        showAlert(t('moderation.noPermission'), t('moderation.noAccess'))
        navigate(`/event/${code}`)
        return
      }

      setEvent(eventData)

      const queueData = await getModerationQueue(eventData.id)
      setQueue(queueData)

      // Run Gemini analysis for items not yet analyzed
      for (const item of queueData) {
        if (!item.gemini_suggestion && item.photos) {
          try {
            const analysis = await analyzePhotoForModeration(item.photo_id, item.photos.storage_path)
            // Persist AI suggestion and potential exact error message
            await setModerationAISuggestion(item.id, analysis.suggestion, analysis.confidence, analysis.errorMessage)

            // Update local state to show the badge
            setQueue(prev => prev.map(q =>
              q.id === item.id
                ? { 
                    ...q, 
                    gemini_suggestion: analysis.suggestion, 
                    confidence_score: analysis.confidence,
                    error_message: analysis.errorMessage 
                  }
                : q
            ))

            // ── Auto-action: high-confidence approve or any reject ────────────
            if (analysis.suggestion) {
              const shouldAutoAction =
                analysis.suggestion === 'reject' ||
                (analysis.suggestion === 'approve' && analysis.confidence >= AUTO_APPROVE_THRESHOLD)

              if (shouldAutoAction) {
                // Actually persist to DB, not just remove from local state
                await moderatePhoto(
                  item.photo_id,
                  analysis.suggestion,
                  `IA Gemini (confianza: ${Math.round(analysis.confidence * 100)}%)`,
                  'gemini-auto'
                )
                setQueue(prev => prev.filter(q => q.photo_id !== item.photo_id))
              }
            }
          } catch {
            // Error analyzing photo
          }
        }
      }
    } catch {
      // Failed to load moderation data
    } finally {
      setLoading(false)
    }
  }, [code, navigate, showAlert])

  useEffect(() => {
    loadModerationData()
  }, [loadModerationData])

  const handleModerate = async (photoId: string, action: 'approve' | 'reject', reason?: string) => {
    setProcessing(photoId)
    try {
      await moderatePhoto(photoId, action, reason, currentUserId ?? undefined)
      setQueue(queue.filter(item => item.photo_id !== photoId))
    } catch {
      showAlert(t('moderation.error'), t('common.error'))
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('common.error')}</p>
        </div>
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
              onClick={() => navigate(`/event/${code}`)}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              {t('event.backToHome')}
            </button>
            
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('moderation.title')}</h1>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {queue.length} {t('moderation.pending')}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {queue.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('moderation.allClear')}</h2>
            <p className="text-gray-600 dark:text-gray-400">{t('moderation.noPending')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {queue.map((item) => (
              <ModerationCard
                key={item.id}
                item={item}
                onModerate={handleModerate}
                processing={processing === item.photo_id}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default ModerationPage
