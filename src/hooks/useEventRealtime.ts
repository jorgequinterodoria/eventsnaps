import { useEffect } from 'react'
import { insforge } from '../lib/insforge'
import type { Photo } from '../lib/insforge'


export function useEventRealtime(
  eventId: string | undefined,
  getCurrentPhotos: () => Photo[],
  addPhoto: (photo: Photo) => void,
  setPhotos: (photos: Photo[]) => void
) {
  useEffect(() => {
    if (!eventId) return

    let mounted = true

    const setup = async () => {
      await insforge.realtime.connect()
      await insforge.realtime.subscribe(`photos:${eventId}`)

      insforge.realtime.on('INSERT_photo', (payload: Record<string, unknown>) => {
        if (!mounted) return
        const current = getCurrentPhotos()
        const newPhoto: Photo = {
          id: payload.id as string,
          event_id: payload.event_id as string,
          storage_path: payload.storage_path as string,
          storage_url: payload.storage_url as string,
          enhanced_url: (payload.enhanced_url as string) || null,
          ai_metadata: (payload.ai_metadata as Record<string, any>) || null,
          caption: payload.caption as string,
          status: payload.status as 'pending' | 'approved' | 'rejected',
          uploaded_by: payload.uploaded_by as string,
          uploaded_at: payload.uploaded_at as string
        }
        if (!current.some((p) => p.id === newPhoto.id)) {
          addPhoto(newPhoto)
        }
      })

      insforge.realtime.on('UPDATE_photo', (payload: Record<string, unknown>) => {
        if (!mounted) return
        const current = getCurrentPhotos()
        const updated: Photo = {
          id: payload.id as string,
          event_id: payload.event_id as string,
          storage_path: payload.storage_path as string,
          storage_url: payload.storage_url as string,
          enhanced_url: (payload.enhanced_url as string) || null,
          ai_metadata: (payload.ai_metadata as Record<string, any>) || null,
          caption: payload.caption as string,
          status: payload.status as 'pending' | 'approved' | 'rejected',
          uploaded_by: payload.uploaded_by as string,
          uploaded_at: payload.uploaded_at as string
        }
        const next = current.map((p) => (p.id === updated.id ? updated : p))
        setPhotos(next)
      })
    }

    const init = async () => {
      try {
        await setup()
      } catch {
        /* intentional fall through */
        // failed to setup realtime event
      }
    }
    init()

    return () => {
      mounted = false
      insforge.realtime.unsubscribe(`photos:${eventId}`)
    }
  }, [eventId, getCurrentPhotos, addPhoto, setPhotos])
}
