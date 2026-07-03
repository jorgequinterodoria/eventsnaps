import { useTranslation } from 'react-i18next'
import { Shield, Play, Download, Square, CheckSquare, X } from 'lucide-react'
import type { Event as EventType } from '../../lib/insforge'

interface EventActionButtonsProps {
  event: EventType
  visiblePhotosCount: number
  selectMode: boolean
  selectedIdsCount: number
  isDownloadingZip: boolean
  isDownloadingSelected: boolean
  onNavigateModerate: () => void
  onShowCarousel: () => void
  onDownloadAllAsZip: () => void
  onToggleSelectMode: () => void
  onDownloadSelectedZip: () => void
  onSelectAll: () => void
  onDisableSelectMode: () => void
}

export function EventActionButtons({
  event,
  visiblePhotosCount,
  selectMode,
  selectedIdsCount,
  isDownloadingZip,
  isDownloadingSelected,
  onNavigateModerate,
  onShowCarousel,
  onDownloadAllAsZip,
  onToggleSelectMode,
  onDownloadSelectedZip,
  onSelectAll,
  onDisableSelectMode
}: EventActionButtonsProps) {
  const { t } = useTranslation()
  return (
    <>
      {event.moderation_enabled && (
        <button
          onClick={onNavigateModerate}
          className="ml-2 flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
        >
          <Shield className="h-4 w-4 mr-1" /> {t('moderation.title')}
        </button>
      )}

      {visiblePhotosCount > 0 && (
        <button
          onClick={onShowCarousel}
          className="ml-4 flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          <Play className="h-4 w-4 mr-1" /> {t('event.tvMode')}
        </button>
      )}

      {visiblePhotosCount > 0 && (
        <button
          onClick={onDownloadAllAsZip}
          disabled={isDownloadingZip}
          className="ml-2 flex items-center px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm disabled:opacity-50"
        >
          <Download className="h-4 w-4 mr-1" /> {isDownloadingZip ? t('common.loading') : 'Descargar todo'}
        </button>
      )}

      {visiblePhotosCount > 0 && !selectMode && (
        <button
          onClick={onToggleSelectMode}
          className="ml-2 flex items-center px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm"
        >
          <Square className="h-4 w-4 mr-1" /> {t('event.selecting')}
        </button>
      )}

      {visiblePhotosCount > 0 && selectMode && (
        <div className="ml-2 flex items-center space-x-2">
          <button
            onClick={onDownloadSelectedZip}
            disabled={selectedIdsCount === 0 || isDownloadingSelected}
            className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-1" /> {isDownloadingSelected ? t('common.loading') : `Descargar seleccionadas (${selectedIdsCount})`}
          </button>
          <button
            onClick={onSelectAll}
            className="flex items-center px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm"
          >
            <CheckSquare className="h-4 w-4 mr-1" /> Seleccionar todo
          </button>
          <button
            onClick={onDisableSelectMode}
            className="flex items-center px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm"
          >
            <X className="h-4 w-4 mr-1" /> {t('common.cancel')}
          </button>
        </div>
      )}
    </>
  )
}
