import { useEffect } from 'react'
import { insforge } from '@/lib/insforge'
import type { Photo } from '@/lib/insforge'

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

      insforge.realtime.on('INSERT_photo', (payload: any) => {
        if (!mounted) return
        const current = getCurrentPhotos()
        const newPhoto: Photo = {
          id: payload.id,
          event_id: payload.event_id,
          storage_path: payload.storage_path,
          storage_url: payload.storage_url,
          caption: payload.caption,
          status: payload.status,
          uploaded_by: payload.uploaded_by,
          uploaded_at: payload.uploaded_at
        }
        if (!current.some((p) => p.id === newPhoto.id)) {
          addPhoto(newPhoto)
        }
      })

      insforge.realtime.on('UPDATE_photo', (payload: any) => {
        if (!mounted) return
        const current = getCurrentPhotos()
        const updated: Photo = {
          id: payload.id,
          event_id: payload.event_id,
          storage_path: payload.storage_path,
          storage_url: payload.storage_url,
          caption: payload.caption,
          status: payload.status,
          uploaded_by: payload.uploaded_by,
          uploaded_at: payload.uploaded_at
        }
        const next = current.map((p) => (p.id === updated.id ? updated : p))
        setPhotos(next)
      })
    }

    setup().catch(console.error)

    return () => {
      mounted = false
      insforge.realtime.unsubscribe(`photos:${eventId}`)
    }
  }, [eventId, getCurrentPhotos, addPhoto, setPhotos])
}
