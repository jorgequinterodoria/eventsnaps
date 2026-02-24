import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, X, Shield, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEventByCode, getModerationQueue, moderatePhoto, setModerationAISuggestion } from '@/lib/database'
import { analyzePhotoForModeration } from '@/lib/gemini'
import { getPhotoUrl } from '@/lib/database'
import type { Event as EventType } from '@/lib/insforge'
import Footer from '@/components/Footer'
import { useAlert } from '@/contexts/AlertContext'
import { insforge } from '@/lib/insforge'

const AUTO_APPROVE_THRESHOLD = 0.9

const ModerationPage = () => {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { showAlert } = useAlert()
  const [event, setEvent] = useState<EventType | null>(null)
  const [queue, setQueue] = useState<import('@/lib/database').ModerationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadModerationData = useCallback(async () => {
    if (!code) return

    try {
      // ── Auth guard ──────────────────────────────────────────────────────────
      const { data: sessionData } = await insforge.auth.getCurrentSession()
      if (!sessionData?.session) {
        showAlert('Debes iniciar sesión para moderar fotos.', 'Sin acceso')
        navigate('/auth')
        return
      }
      const userId = sessionData.session.user.id
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
        showAlert('No tienes permiso para moderar este evento.', 'Sin acceso')
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
          } catch (error) {
            console.error('Failed to analyze photo:', error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load moderation data:', error)
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
    } catch (error) {
      console.error('Failed to moderate photo:', error)
      showAlert('Error al moderar la foto. Inténtalo de nuevo.', 'Error')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cola de moderación...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Evento no encontrado o no tienes permisos para moderar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(`/event/${code}`)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver al evento
            </button>
            
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-blue-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">Panel de Moderación</h1>
            </div>
            
            <div className="text-sm text-gray-600">
              {queue.length} {queue.length === 1 ? 'foto pendiente' : 'fotos pendientes'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {queue.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Todo en orden!</h2>
            <p className="text-gray-600">No hay fotos pendientes de moderación.</p>
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

function ModerationCard({ 
  item, 
  onModerate, 
  processing 
}: { 
  item: import('@/lib/database').ModerationQueueItem
  onModerate: (photoId: string, action: 'approve' | 'reject', reason?: string) => Promise<void>
  processing: boolean
}) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [imgLoading, setImgLoading] = useState(true)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    const loadImage = async () => {
      if (item.photos) {
        try {
          const url = await getPhotoUrl(item.photos.storage_path)
          setImageUrl(url)
        } catch (error) {
          console.error('Failed to load photo:', error)
        } finally {
          setImgLoading(false)
        }
      }
    }
    loadImage()
  }, [item.photos])

  const handleReject = () => {
    // Reason is now optional
    onModerate(item.photo_id, 'reject', rejectReason.trim() || undefined)
  }

  const geminiConfidence = item.confidence_score ? Math.round(item.confidence_score * 100) : null

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Image */}
      <div className="aspect-square bg-gray-200 relative">
        {imgLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt="Photo for moderation"
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Gemini Suggestion Badge */}
        {item.gemini_suggestion && (
          <div className={cn(
            "absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium",
            item.gemini_suggestion === 'approve' 
              ? "bg-green-100 text-green-800" 
              : "bg-red-100 text-red-800"
          )}>
            <div className="flex items-center">
              <Shield className="h-3 w-3 mr-1" />
              IA: {item.gemini_suggestion === 'approve' ? '✅ aprobar' : '❌ rechazar'}
              {geminiConfidence && (
                <span className="ml-1">({geminiConfidence}%)</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <Clock className="h-4 w-4 mr-1" />
          {new Date(item.queued_at).toLocaleString('es-CO')}
        </div>
        
        {item.photos?.caption && (
          <p className="text-sm text-gray-700 mb-4">
            <strong>Pie de foto:</strong> {item.photos.caption}
          </p>
        )}

        {/* Action Buttons */}
        {!showRejectReason ? (
          <div className="flex space-x-3">
            <button
              onClick={() => onModerate(item.photo_id, 'approve')}
              disabled={processing}
              className={cn(
                "flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md",
                "text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500",
                "disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              )}
            >
              <Check className="h-4 w-4 mr-2" />
              Aprobar
            </button>
            
            <button
              onClick={() => setShowRejectReason(true)}
              disabled={processing}
              className={cn(
                "flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md",
                "text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500",
                "disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              )}
            >
              <X className="h-4 w-4 mr-2" />
              Rechazar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Razón del rechazo (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              rows={2}
            />
            
            <div className="flex space-x-3">
              <button
                onClick={handleReject}
                disabled={processing}
                className={cn(
                  "flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md",
                  "text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                )}
              >
                <X className="h-4 w-4 mr-2" />
                Confirmar rechazo
              </button>
              
              <button
                onClick={() => {
                  setShowRejectReason(false)
                  setRejectReason('')
                }}
                disabled={processing}
                className={cn(
                  "flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md",
                  "text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                )}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModerationPage
