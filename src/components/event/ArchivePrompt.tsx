import { useTranslation } from 'react-i18next'
import { Archive, Clock, Download, Cloud, AlertTriangle } from 'lucide-react'
import { useAlbumArchive } from '../../hooks/useAlbumArchive'

interface ArchivePromptProps {
  eventId: string
  expiresAt: string
  isCreator: boolean
  archived: boolean
}

export function ArchivePrompt({ eventId, expiresAt, isCreator, archived }: ArchivePromptProps) {
  const { t } = useTranslation()
  const { archiveEvent, exportToGooglePhotos, exportToDrive, isArchiving } = useAlbumArchive(eventId)

  if (!isCreator) return null

  const now = new Date()
  const expires = new Date(expiresAt)
  const twoHoursInMs = 2 * 60 * 60 * 1000
  const isExpiringSoon = expires.getTime() - now.getTime() <= twoHoursInMs && expires.getTime() > now.getTime()

  if (!archived && !isExpiringSoon) return null

  return (
    <div className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white shadow-lg">
      {archived ? (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Archive className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{t('archive.saved')}</h3>
            <p className="text-sm text-white/90">{t('archive.savedDesc')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={exportToGooglePhotos}
                className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
              >
                <Cloud className="h-4 w-4" />
                Google Photos
              </button>
              <button
                onClick={exportToDrive}
                className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
              >
                <Download className="h-4 w-4" />
                Google Drive
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{t('archive.expiring')}</h3>
            <p className="text-sm text-white/90">{t('archive.expiringDesc')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={archiveEvent}
                disabled={isArchiving}
                className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-orange-600 hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {isArchiving ? t('archive.saving') : t('archive.saveNow')}
              </button>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
              >
                <Clock className="h-4 w-4" />
                {t('archive.later')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
