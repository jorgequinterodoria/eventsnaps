import { useEffect, useCallback, useRef } from 'react'
import { insforge } from '@/lib/insforge'

export function useInsforgeRealtime(eventId?: string) {
    const connectedRef = useRef(false)

    useEffect(() => {
        if (!eventId) return

        const setup = async () => {
            if (!connectedRef.current) {
                await insforge.realtime.connect()
                connectedRef.current = true
            }
            await insforge.realtime.subscribe(`event:${eventId}`)
            await insforge.realtime.subscribe(`jukebox:${eventId}`)
        }

        setup().catch(console.error)

        return () => {
            insforge.realtime.unsubscribe(`event:${eventId}`)
            insforge.realtime.unsubscribe(`jukebox:${eventId}`)
        }
    }, [eventId])

    const on = useCallback((event: string, handler: (payload: any) => void) => {
        insforge.realtime.on(event, handler)
    }, [])

    const off = useCallback((event: string, handler: (payload: any) => void) => {
        insforge.realtime.off(event, handler)
    }, [])

    const emit = useCallback(async (event: string, payload: any) => {
        if (!eventId) return
        // Determine the correct channel for the event
        const channel = event.startsWith('nowPlaying') ? `event:${eventId}` : `jukebox:${eventId}`
        try {
            await insforge.realtime.publish(channel, event, payload)
        } catch (err) {
            console.error('Failed to publish realtime event:', err)
        }
    }, [eventId])

    return { on, off, emit }
}
