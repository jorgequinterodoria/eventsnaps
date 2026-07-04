import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Palette, Sticker, Wand2, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { usePhotoEnhancement, type EnhancementType, type FilterPreset } from '../../hooks/usePhotoEnhancement'

interface PhotoEnhancerProps {
  photoId: string
  storagePath: string
  currentUrl: string
  eventTheme?: string
  isOpen: boolean
  onClose: () => void
  onEnhanced?: (enhancedUrl: string) => void
}

const filterPresets: { id: FilterPreset; label: string }[] = [
  { id: 'vintage', label: 'Vintage' },
  { id: 'neon', label: 'Neón' },
  { id: 'black_white', label: 'B&N' },
  { id: 'warm', label: 'Cálido' },
  { id: 'cool', label: 'Frío' },
  { id: 'dramatic', label: 'Dramático' },
]

export function PhotoEnhancer({
  photoId,
  storagePath,
  currentUrl,
  eventTheme,
  isOpen,
  onClose,
  onEnhanced,
}: PhotoEnhancerProps) {
  const { t } = useTranslation()
  const { enhancePhoto, isEnhancing } = usePhotoEnhancement()
  const [previewUrl, setPreviewUrl] = useState(currentUrl)
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const handleEnhance = async (type: EnhancementType, filter?: FilterPreset) => {
    try {
      const result = await enhancePhoto(photoId, storagePath, type, filter, eventTheme)
      if (result?.enhancedUrl) {
        setPreviewUrl(result.enhancedUrl)
        setSelectedFilter(filter || null)
        onEnhanced?.(result.enhancedUrl)
      }
    } catch {
      // error already shown by hook
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-base font-semibold dark:text-white">
            {t('enhance.title', 'Mejorar Foto')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Preview */}
        <div className="relative bg-gray-100 dark:bg-gray-800">
          <img src={previewUrl} alt="Preview" className="w-full h-40 object-contain" />
          {isEnhancing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent mb-2" />
              <span className="text-white text-xs font-medium">{t('enhance.processing', 'Procesando...')}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleEnhance('enhance')}
              disabled={isEnhancing}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Wand2 className="h-3.5 w-3.5" />
              {t('enhance.auto', 'Auto-mejora')}
            </button>

            <button
              onClick={() => handleEnhance('remove_bg')}
              disabled={isEnhancing}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('enhance.removeBg', 'Quitar fondo')}
            </button>

            <button
              onClick={() => handleEnhance('sticker')}
              disabled={isEnhancing}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                'bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Sticker className="h-3.5 w-3.5" />
              {t('enhance.sticker', 'Sticker/Marco')}
            </button>

            <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Palette className="h-3.5 w-3.5" />
              {t('enhance.filters', 'Filtros')}
            </div>
          </div>

          {/* Filter presets grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {filterPresets.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleEnhance('filter', filter.id)}
                disabled={isEnhancing}
                className={cn(
                  'px-2 py-2.5 rounded-md text-xs font-medium transition-colors',
                  selectedFilter === filter.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
