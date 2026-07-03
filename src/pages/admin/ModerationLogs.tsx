import { useTranslation } from 'react-i18next'
import { ShieldAlert, AlertTriangle, RefreshCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { OrganizedModerationLog } from '../../types/admin'
import { APP_CONFIG } from '../../constants/config'
import { ModerationLogRow } from '../../components/moderation/ModerationLogRow'

interface ModerationLogsProps {
  modLogs: OrganizedModerationLog[]
  loadingLogs: boolean
  retrying: boolean
  expandedEvents: Set<string>
  loadModLogs: () => void
  retryGeminiErrors: () => void
  toggleEventExpand: (eventId: string) => void
}

export const ModerationLogs = ({
  modLogs,
  loadingLogs,
  retrying,
  expandedEvents,
  loadModLogs,
  retryGeminiErrors,
  toggleEventExpand
}: ModerationLogsProps) => {
  const { t } = useTranslation()
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <ShieldAlert className="h-5 w-5 mr-2 text-blue-600" />
          {t('admin.moderationLogs')}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={retryGeminiErrors}
            disabled={retrying}
            className="flex items-center gap-1.5 text-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            {retrying ? t('admin.reanalyzing') : t('admin.retryGemini')}
          </button>
          <button
            onClick={loadModLogs}
            disabled={loadingLogs}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 font-medium transition-colors"
          >
            <RefreshCcw className={`h-4 w-4 ${loadingLogs ? 'animate-spin' : ''}`} />
            {loadingLogs ? t('common.loading') : t('admin.refresh')}
          </button>
        </div>
      </div>

      {modLogs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">{t('admin.noData')}</p>
      ) : (
        <div className="space-y-3">
          {modLogs.map(({ event, rows }) => {
            const pending  = rows.filter(r => !r.processed).length
            const approved = rows.filter(r => r.processed && r.photos?.status === 'approved').length
            const rejected = rows.filter(r => r.processed && r.photos?.status === 'rejected').length
            const geminiErrors = rows.filter(r =>
              !r.processed && (!r.gemini_suggestion || r.confidence_score === 0)
            ).length
            const isOpen = expandedEvents.has(event.id)

            return (
              <div key={event.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  onClick={() => toggleEventExpand(event.id)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <span className="font-bold text-gray-900 font-mono tracking-wider">{event.code}</span>
                    <span className="text-xs text-gray-500">{t('common.photosInQueue', { count: rows.length })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    {geminiErrors > 0 && (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        {geminiErrors} {t('admin.geminiErrors')}
                      </span>
                    )}
                    <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{pending} {t('moderation.pending')}</span>
                    <span className="text-green-700 bg-green-50 px-2 py-1 rounded-full">{approved} aprobadas</span>
                    <span className="text-red-700 bg-red-50 px-2 py-1 rounded-full">{rejected} rechazadas</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="divide-y divide-gray-100">
                    <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white">
                      <span className="col-span-4">Foto / Caption</span>
                      <span className="col-span-2">Estado</span>
                      <span className="col-span-2">IA Gemini</span>
                      <span className="col-span-2">Confianza</span>
                      <span className="col-span-2">En cola desde</span>
                    </div>
                    {rows.map((row) => (
                      <ModerationLogRow key={row.id} row={row} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
