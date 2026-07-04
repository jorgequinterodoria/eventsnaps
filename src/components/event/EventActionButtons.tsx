import { useTranslation } from 'react-i18next'
import { Shield, Download, Square, CheckSquare, X } from 'lucide-react'
import type { Event as EventType } from '../../lib/insforge'

interface EventActionButtonsProps {
  event: EventType
  visiblePhotosCount: number
  selectMode: boolean
  selectedIdsCount: number
  isDownloadingZip: boolean
  isDownloadingSelected: boolean
  onNavigateModerate: () => void
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
  onDownloadAllAsZip,
  onToggleSelectMode,
  onDownloadSelectedZip,
  onSelectAll,
  onDisableSelectMode
}: EventActionButtonsProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      {event.moderation_enabled && (
        <button
          onClick={onNavigateModerate}
          className="flex items-center px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm"
        >
          <Shield className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{t('moderation.title')}</span><Shield className="h-4 w-4 sm:hidden" />
        </button>
      )}

      {visiblePhotosCount > 0 && (
        <button
          onClick={onDownloadAllAsZip}
          disabled={isDownloadingZip}
          className="flex items-center px-3 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm disabled:opacity-50"
        >
          <Download className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{isDownloadingZip ? t('common.loading') : 'Descargar todo'}</span>
        </button>
      )}

      {visiblePhotosCount > 0 && !selectMode && (
        <button
          onClick={onToggleSelectMode}
          className="flex items-center px-3 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm"
        >
          <Square className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{t('event.selecting')}</span>
        </button>
      )}

      {visiblePhotosCount > 0 && selectMode && (
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={onDownloadSelectedZip}
            disabled={selectedIdsCount === 0 || isDownloadingSelected}
            className="flex items-center px-3 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{isDownloadingSelected ? t('common.loading') : `Descargar seleccionadas (${selectedIdsCount})`}</span>
          </button>
          <button
            onClick={onSelectAll}
            className="flex items-center px-3 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm"
          >
            <CheckSquare className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Seleccionar todo</span>
          </button>
          <button
            onClick={onDisableSelectMode}
            className="flex items-center px-3 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm"
          >
            <X className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">{t('common.cancel')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
