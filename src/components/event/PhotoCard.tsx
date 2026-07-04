import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Download, Square, CheckSquare } from 'lucide-react' // Sparkles removed - AI disabled
import type { Photo } from '../../lib/insforge'
import { getPhotoUrl, downloadPhotoBlob } from '../../lib/database'
import { useAlert } from '../../contexts/AlertContext'
import { cn } from '../../lib/utils'
// import { PhotoEnhancer } from './PhotoEnhancer' // AI enhancement disabled
import ReactionBar from './ReactionBar'

interface PhotoCardProps {
  photo: Photo
  selectionEnabled?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  eventId?: string
  eventTheme?: string
}

export function PhotoCard({ photo, selectionEnabled, selected, onToggleSelect, eventId, eventTheme }: PhotoCardProps) {
  const { t } = useTranslation()
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  // const [showEnhancer, setShowEnhancer] = useState(false) // AI disabled
  const { showAlert } = useAlert()

  useEffect(() => {
    const loadImage = async () => {
      if (photo.status === 'pending') {
        setLoading(false)
        return
      }
      try {
        const url = photo.enhanced_url || await getPhotoUrl(photo.storage_path)
        setImageUrl(url)
      } catch {
        /* intentional fall through */
      } finally {
        setLoading(false)
      }
    }
    loadImage()
  }, [photo.storage_path, photo.status])

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden group relative">
      {photo.status === 'pending' ? (
        <div className="aspect-square bg-gray-200 animate-pulse flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600" />
          </div>
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-800 mr-1"></div>
            En moderación
          </div>
        </div>
      ) : loading ? (
        <div className="aspect-square bg-gray-200 animate-pulse flex items-center justify-center">
          <Camera className="h-12 w-12 text-gray-400" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => selectionEnabled && onToggleSelect ? onToggleSelect() : undefined}
          className="w-full"
        >
          <img
            src={imageUrl}
            alt={photo.caption || t('common.eventPhoto')}
            className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-200"
          />
        </button>
      )}
      {selectionEnabled && !loading && (
        <div className="absolute top-2 right-2">
          <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-sm cursor-pointer", selected ? "bg-blue-600 text-white" : "bg-white text-gray-700 border") }>
            {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            <span className="hidden sm:inline">{selected ? 'Seleccionada' : 'Seleccionar'}</span>
          </span>
        </div>
      )}
      {photo.caption && (
        <div className="p-4">
          <p className="text-sm text-gray-600">{photo.caption}</p>
        </div>
      )}
      {!loading && photo.status !== 'pending' && (
        <div className="p-4 pt-0">
          <div className="flex items-center gap-2 mb-2">
            {/* AI enhance button disabled
            {eventId && (
              <button
                onClick={() => setShowEnhancer(true)}
                className="inline-flex items-center px-3 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md text-sm"
              >
                <Sparkles className="h-4 w-4 mr-1" /> IA
              </button>
            )}
            */}
            <button
              onClick={async () => {
                try {
                  const blob = await downloadPhotoBlob(photo.storage_path)
                  const url = URL.createObjectURL(blob)
                  const parts = photo.storage_path.split('/')
                  const name = parts[parts.length - 1]
                  const a = document.createElement('a')
                  a.href = url
                  a.download = name
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                } catch {
                  showAlert(t('common.downloadError'), t('common.error'))
                }
              }}
              className="inline-flex items-center px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm"
            >
              <Download className="h-4 w-4 mr-1" /> Descargar
            </button>
          </div>
          {eventId && <ReactionBar photoId={photo.id} eventId={eventId} />}
        </div>
      )}
      {/* AI enhancement disabled
      {showEnhancer && eventId && (
        <PhotoEnhancer
          isOpen={showEnhancer}
          photoId={photo.id}
          storagePath={photo.storage_path}
          currentUrl={imageUrl}
          eventTheme={eventTheme}
          onEnhanced={(url) => setImageUrl(url)}
          onClose={() => setShowEnhancer(false)}
        />
      )}
      */}
    </div>
  )
}
