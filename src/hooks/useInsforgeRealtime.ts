import { useEffect, useCallback, useRef } from 'react'
import { insforge } from '../lib/insforge'

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

    const on = useCallback(<T = Record<string, unknown>>(event: string, handler: (payload: T) => void) => {
        insforge.realtime.on(event, handler)
    }, [])

    const off = useCallback(<T = Record<string, unknown>>(event: string, handler: (payload: T) => void) => {
        insforge.realtime.off(event, handler)
    }, [])

    const emit = useCallback(async <T = Record<string, unknown>>(event: string, payload: T) => {
        if (!eventId) return
        // Determine the correct channel for the event
        const channel = event.startsWith('nowPlaying') ? `event:${eventId}` : `jukebox:${eventId}`
        try {
            await insforge.realtime.publish(channel, event, payload)
        } catch {
            /* intentional fall through */
            // failed to publish realtime event
        }
    }, [eventId])

    return { on, off, emit }
}
