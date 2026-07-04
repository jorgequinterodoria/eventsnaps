import { useTranslation } from 'react-i18next'
import { Film, Download, Share2, Loader2 } from 'lucide-react'
import { useEventReel } from '../../hooks/useEventReel'

interface ReelPreviewProps {
  eventId: string
  isCreator?: boolean
}

export function ReelPreview({ eventId, isCreator = false }: ReelPreviewProps) {
  const { t } = useTranslation()
  const { recap, isGenerating, generateReel } = useEventReel(eventId)

  const showReady = recap && recap.status === 'ready' && recap.video_url
  const showGenerating = isGenerating || (recap && recap.status === 'generating')
  const showGenerateButton = !recap && isCreator

  if (!showReady && !showGenerating && !showGenerateButton) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <Film className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-semibold dark:text-white">
          {t('reel.title', 'Reel / Aftermovie')}
        </h3>
      </div>

      <div className="p-5">
        {showGenerating && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
            <span className="text-gray-500 dark:text-gray-400">
              {t('reel.generating', 'Generando reel...')}
            </span>
          </div>
        )}

        {showReady && (
          <div className="space-y-4">
            <video
              src={recap.video_url!}
              controls
              className="w-full rounded-xl"
            />
            <div className="flex gap-2">
              <a
                href={recap.video_url!}
                download
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition-colors text-sm font-medium"
              >
                <Download className="h-4 w-4" />
                {t('reel.download', 'Descargar')}
              </a>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'Reel del evento', url: recap.video_url! })
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <Share2 className="h-4 w-4" />
                {t('reel.share', 'Compartir')}
              </button>
            </div>
          </div>
        )}

        {showGenerateButton && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Film className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <span className="text-gray-400 dark:text-gray-500 text-sm">
              {t('reel.noRecap', 'Aún no hay reel disponible')}
            </span>
            <button
              onClick={() => generateReel()}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Film className="h-4 w-4" />
              {t('reel.generate', 'Generar Reel')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
