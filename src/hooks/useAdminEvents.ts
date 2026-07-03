import { useState, useCallback } from 'react'
import { insforge } from '../lib/insforge'
import { AdminEvent } from '../types/admin'

export const useAdminEvents = () => {
    const [events, setEvents] = useState<AdminEvent[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const loadEvents = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data: eventsData } = await insforge.database.from('events').select(`
        *,
        jukebox_settings (*)
      `).order('created_at', { ascending: false })
            setEvents(eventsData || [])
        } finally {
            setIsLoading(false)
        }
    }, [])

    const toggleJukebox = async (eventId: string, isActive: boolean, provider: 'spotify' | 'youtube' = 'spotify') => {
        const { data } = await insforge.database.from('jukebox_settings').select('*').eq('event_id', eventId).single()

        if (data) {
            await insforge.database.from('jukebox_settings').update({ is_active: !isActive, provider }).eq('event_id', eventId)
        } else {
            await insforge.database.from('jukebox_settings').insert({ event_id: eventId, is_active: true, provider })
        }
        await loadEvents()
    }

    const changeProvider = async (eventId: string, provider: string) => {
        await insforge.database.from('jukebox_settings').update({ provider }).eq('event_id', eventId)
        await loadEvents()
    }

    return {
        events,
        isLoadingEvents: isLoading,
        loadEvents,
        toggleJukebox,
        changeProvider,
    }
}
