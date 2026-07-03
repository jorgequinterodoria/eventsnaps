import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Download, Square, CheckSquare } from 'lucide-react'
import type { Photo } from '../../lib/insforge'
import { getPhotoUrl, downloadPhotoBlob } from '../../lib/database'
import { useAlert } from '../../contexts/AlertContext'
import { cn } from '../../lib/utils'

interface PhotoCardProps {
  photo: Photo
  selectionEnabled?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

export function PhotoCard({ photo, selectionEnabled, selected, onToggleSelect }: PhotoCardProps) {
  const { t } = useTranslation()
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const { showAlert } = useAlert()

  useEffect(() => {
    const loadImage = async () => {
      if (photo.status === 'pending') {
        setLoading(false)
        return
      }
      try {
        const url = await getPhotoUrl(photo.storage_path)
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
            {selected ? <CheckSquare className="h-4 w-4 mr-1" /> : <Square className="h-4 w-4 mr-1" />}
            {selected ? 'Seleccionada' : 'Seleccionar'}
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
            className="inline-flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-sm"
          >
            <Download className="h-4 w-4 mr-1" /> Descargar
          </button>
        </div>
      )}
    </div>
  )
}
