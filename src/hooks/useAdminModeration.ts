import { useState, useCallback } from 'react'
import { insforge } from '../lib/insforge'
import { OrganizedModerationLog, ModerationQueueEntry } from '../types/admin'
import { useAlert } from '../contexts/AlertContext'

export const useAdminModeration = () => {
    const [modLogs, setModLogs] = useState<OrganizedModerationLog[]>([])
    const [loadingLogs, setLoadingLogs] = useState(false)
    const [retrying, setRetrying] = useState(false)
    const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
    const { showAlert } = useAlert()

    const loadModLogs = useCallback(async () => {
        setLoadingLogs(true)
        try {
            const { data: queueRows } = await insforge.database
                .from('moderation_queues')
                .select(`
          id,
          photo_id,
          queued_at,
          gemini_suggestion,
          confidence_score,
          processed,
          error_message,
          photos (
            id,
            status,
            storage_path,
            caption,
            event_id,
            events ( id, code, creator_id )
          )
        `)
                .order('queued_at', { ascending: false })
                .limit(200)

            if (!queueRows) return

            const byEvent: Record<string, OrganizedModerationLog> = {}
            for (const row of queueRows as unknown as ModerationQueueEntry[]) {
                const event = row.photos?.events
                if (!event) continue
                if (!byEvent[event.id]) byEvent[event.id] = { event, rows: [] }
                byEvent[event.id].rows.push(row)
            }
            setModLogs(Object.values(byEvent))
        } finally {
            setLoadingLogs(false)
        }
    }, [])

    const toggleEventExpand = (eventId: string) => {
        setExpandedEvents(prev => {
            const next = new Set(prev)
            if (next.has(eventId)) {
                next.delete(eventId)
            } else {
                next.add(eventId)
            }
            return next
        })
    }

    const retryGeminiErrors = async () => {
        setRetrying(true)
        try {
            const { data: failedRows } = await insforge.database
                .from('moderation_queues')
                .select('id, photo_id, photos ( storage_path )')
                .eq('processed', false)
                .is('gemini_suggestion', null)

            if (!failedRows || failedRows.length === 0) {
                showAlert('No hay fotos con error de Gemini pendientes.')
                setRetrying(false)
                return
            }

            const insforgeUrl = import.meta.env.VITE_INSFORGE_URL
            const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY
            let successes = 0

            for (const row of failedRows as unknown as Array<{ id: string; photo_id: string; photos: { storage_path: string } | null }>) {
                const storagePath = row.photos?.storage_path
                if (!storagePath) continue
                try {
                    const { data, error } = await insforge.functions.invoke('moderate-photo', {
                        body: { storagePath, insforgeUrl, anonKey }
                    })

                    if (error) {
                        await insforge.database
                            .from('moderation_queues')
                            .update({ error_message: `Error de red: ${error.message}` })
                            .eq('id', row.id)
                        continue
                    }

                    const analysis = data as { suggestion?: 'approve' | 'reject', confidence?: number, errorMessage?: string }

                    if (!analysis || !analysis.suggestion || analysis.confidence === 0 || analysis.errorMessage) {
                        if (analysis && analysis.errorMessage) {
                            await insforge.database
                                .from('moderation_queues')
                                .update({ error_message: analysis.errorMessage })
                                .eq('id', row.id)
                        }
                        continue
                    }

                    await insforge.database
                        .from('moderation_queues')
                        .update({
                            gemini_suggestion: analysis.suggestion,
                            confidence_score: analysis.confidence,
                            error_message: null
                        })
                        .eq('id', row.id)

                    const AUTO_THRESHOLD = 0.9
                    if (analysis.suggestion === 'reject' || (analysis.suggestion === 'approve' && analysis.confidence! >= AUTO_THRESHOLD)) {
                        await insforge.database
                            .from('photos')
                            .update({ status: analysis.suggestion === 'approve' ? 'approved' : 'rejected' })
                            .eq('id', row.photo_id)
                        await insforge.database
                            .from('moderation_queues')
                            .update({ processed: true })
                            .eq('id', row.id)
                        await insforge.database
                            .from('moderation_actions')
                            .insert({
                                photo_id: row.photo_id,
                                moderator_id: 'gemini-retry',
                                action: analysis.suggestion,
                                reason: `IA Gemini reintento (confianza: ${Math.round(analysis.confidence! * 100)}%)`
                            })
                    }
                    successes++
                } catch {
                    /* intentional fall through */
                }
            }
            await loadModLogs()
            showAlert(`Reintento completado: ${successes} de ${failedRows.length} fotos re-analizadas correctamente.`)
        } catch (err: unknown) {
            if (err instanceof Error) {
                showAlert(err.message || 'Error en el reintento', 'Error')
            } else {
                showAlert('Error en el reintento', 'Error')
            }
        } finally {
            setRetrying(false)
        }
    }

    return {
        modLogs,
        loadingLogs,
        retrying,
        expandedEvents,
        loadModLogs,
        toggleEventExpand,
        retryGeminiErrors,
    }
}
