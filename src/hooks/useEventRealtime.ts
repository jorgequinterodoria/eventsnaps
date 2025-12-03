import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Photo } from '@/lib/supabase'

export function useEventRealtime(
  eventId: string | undefined,
  getCurrentPhotos: () => Photo[],
  addPhoto: (photo: Photo) => void,
  setPhotos: (photos: Photo[]) => void
) {
  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`realtime:photos:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'photos', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const current = getCurrentPhotos()
          const newPhoto = payload.new as Photo
          if (!current.some((p) => p.id === newPhoto.id)) {
            addPhoto(newPhoto)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'photos', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const current = getCurrentPhotos()
          const updated = payload.new as Photo
          const next = current.map((p) => (p.id === updated.id ? updated : p))
          setPhotos(next)
        }
      )

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, getCurrentPhotos, addPhoto, setPhotos])
}
