import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, Shield, Clock } from 'lucide-react'
import { cn } from '../../lib/utils'
import { getPhotoUrl, type ModerationQueueItem } from '../../lib/database'

interface ModerationCardProps {
  item: ModerationQueueItem
  onModerate: (photoId: string, action: 'approve' | 'reject', reason?: string) => Promise<void>
  processing: boolean
}

export function ModerationCard({ item, onModerate, processing }: ModerationCardProps) {
  const { t } = useTranslation()
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
        } catch {
          /* intentional fall through */
        } finally {
          setImgLoading(false)
        }
      }
    }
    loadImage()
  }, [item.photos])

  const handleReject = () => {
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
            <strong>{t('common.caption')}</strong> {item.photos.caption}
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
