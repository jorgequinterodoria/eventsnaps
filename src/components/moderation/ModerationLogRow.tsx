import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { APP_CONFIG } from '../../constants/config'
import type { OrganizedModerationLog } from '../../types/admin'

type ModerationQueueRow = OrganizedModerationLog['rows'][number]

interface ModerationLogRowProps {
  row: ModerationQueueRow
}

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprobada',
  rejected: 'Rechazada',
  pending: 'Pendiente',
}

export function ModerationLogRow({ row }: ModerationLogRowProps) {
  const { t } = useTranslation()
  const isGeminiError = !row.gemini_suggestion || row.confidence_score === 0
  const conf = row.confidence_score ? Math.round(row.confidence_score * 100) : null
  const status = row.photos?.status ?? 'pending'

  const confBarClass =
    conf !== null && conf >= APP_CONFIG.MODERATION.CONFIDENCE_HIGH
      ? 'bg-green-500'
      : conf !== null && conf >= APP_CONFIG.MODERATION.CONFIDENCE_MEDIUM
      ? 'bg-amber-400'
      : 'bg-red-400'

  return (
    <div
      className={`grid grid-cols-12 gap-2 px-5 py-3 text-sm items-center ${
        isGeminiError && !row.processed ? 'bg-red-50' : 'bg-white'
      }`}
    >
      {/* Caption / Error */}
      <div className="col-span-4 truncate text-gray-700">
        {row.photos?.caption || <span className="text-gray-400 italic">{t('common.noCaption')}</span>}
        {isGeminiError && !row.processed && (
          <span
            className="ml-2 inline-flex items-center gap-1 text-xs text-red-600 font-medium truncate max-w-[200px]"
            title={row.error_message || 'Error API Gemini'}
          >
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            {row.error_message || 'Error API Gemini'}
          </span>
        )}
      </div>

      {/* Status badge */}
      <div className="col-span-2">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            STATUS_STYLES[status] ?? STATUS_STYLES.pending
          }`}
        >
          {STATUS_LABELS[status] ?? 'Pendiente'}
        </span>
      </div>

      {/* Gemini suggestion */}
      <div className="col-span-2">
        {row.gemini_suggestion ? (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              row.gemini_suggestion === 'approve'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {row.gemini_suggestion === 'approve' ? '✅ aprobar' : '❌ rechazar'}
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Sin análisis</span>
        )}
      </div>

      {/* Confidence bar */}
      <div className="col-span-2">
        {conf !== null ? (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${confBarClass}`}
                style={{ width: `${conf}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 w-8 text-right">{conf}%</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </div>

      {/* Queued at */}
      <div className="col-span-2 text-xs text-gray-500">
        {new Date(row.queued_at).toLocaleString('es-CO', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </div>
    </div>
  )
}
