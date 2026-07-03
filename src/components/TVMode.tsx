import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Music, Image, X } from 'lucide-react'
import { getEventByCode, getEventPhotos } from '../lib/database'
import { insforge } from '../lib/insforge'
import { useInsforgeRealtime } from '../hooks/useInsforgeRealtime'
import type { Photo, JukeboxQueueItem } from '../lib/insforge'

const SLIDE_INTERVAL = 6000
const CROSSFADE_DURATION = 1000

interface TVModeProps {
  eventCode: string
  onExit: () => void
}

function getDirectPhotoUrl(storagePath: string): string {
  const baseUrl = import.meta.env.VITE_INSFORGE_URL
  return `${baseUrl}/api/storage/buckets/photos/objects/${encodeURIComponent(storagePath)}`
}

export default function TVMode({ eventCode, onExit }: TVModeProps) {
  const { t } = useTranslation()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState<number | null>(null)
  const [fading, setFading] = useState(false)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()
  const [eventId, setEventId] = useState<string | null>(null)
  const [nowPlaying, setNowPlaying] = useState<JukeboxQueueItem | null>(null)
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const event = await getEventByCode(eventCode)
      if (event) {
        setEventId(event.id)
        const eventPhotos = await getEventPhotos(event.id)
        setPhotos(eventPhotos.filter(p => p.status !== 'rejected'))
      }
    }
    load()
  }, [eventCode])

  const { on, off } = useInsforgeRealtime(eventId || '')

  useEffect(() => {
    if (!eventId) return

    const loadQueue = async () => {
      const { data } = await insforge.database.from('jukebox_queue')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'pending')
        .order('votes', { ascending: false })
        .order('created_at', { ascending: true })
      setQueueCount(data?.length || 0)
      if (data && data.length > 0 && !nowPlaying) {
        setNowPlaying(data[0] as JukeboxQueueItem)
      }
    }
    loadQueue()

    const handleNowPlaying = (data: { track: JukeboxQueueItem }) => {
      setNowPlaying(data.track)
    }
    const handleQueueUpdated = () => { loadQueue() }
    const handleInsert = () => { loadQueue() }

    on('nowPlaying:set', handleNowPlaying)
    on('queue:updated', handleQueueUpdated)
    on('INSERT_jukebox', handleInsert)

    return () => {
      off('nowPlaying:set', handleNowPlaying)
      off('queue:updated', handleQueueUpdated)
      off('INSERT_jukebox', handleInsert)
    }
  }, [eventId, on, off, nowPlaying])

  const advance = useCallback(() => {
    if (photos.length === 0) return
    setFading(true)
    setNextIndex((currentIndex + 1) % photos.length)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length)
      setNextIndex(null)
      setFading(false)
    }, CROSSFADE_DURATION)
  }, [photos, currentIndex])

  useEffect(() => {
    if (paused || photos.length === 0) return
    intervalRef.current = setInterval(advance, SLIDE_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [advance, paused, photos.length])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit()
      if (e.key === ' ') { e.preventDefault(); setPaused(p => !p) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onExit])

  useEffect(() => {
    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }
  }, [])

  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-2xl">{t('common.noPhotos')}</p>
          <p className="text-gray-400 mt-2">{t('tv.pressEsc')}</p>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]
  const pendingCount = queueCount

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {currentPhoto && (
        <img
          key={currentPhoto.id}
          src={currentPhoto.storage_url || getDirectPhotoUrl(currentPhoto.storage_path)}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            opacity: fading ? 0 : 1,
            transitionProperty: 'opacity',
            transitionDuration: `${CROSSFADE_DURATION}ms`,
            transitionTimingFunction: 'ease-in-out'
          }}
          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="14">No image</text></svg>' }}
        />
      )}

      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />

      <div className="absolute top-4 right-4 flex items-center gap-3">
        <button
          onClick={() => setPaused(p => !p)}
          className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm backdrop-blur-sm transition"
        >
          {paused ? '▶' : '⏸'}
        </button>
        <button
          onClick={onExit}
          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white backdrop-blur-sm transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/20 rounded-lg text-white text-sm backdrop-blur-sm">
        {currentIndex + 1} / {photos.length}
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white/20 rounded-lg text-white text-sm backdrop-blur-sm">
        {eventCode}
      </div>

      {nowPlaying && (
        <div className="absolute bottom-8 left-8 flex items-center gap-4">
          {nowPlaying.album_art && (
            <img src={nowPlaying.album_art} alt="" className="w-16 h-16 rounded-lg shadow-lg object-cover" />
          )}
          <div>
            <div className="flex items-center gap-2 text-white/60 text-sm mb-1">
              <Music className="h-4 w-4" />
              {t('tv.nowPlaying')}
            </div>
            <h3 className="text-2xl font-bold text-white">{nowPlaying.title}</h3>
            <p className="text-lg text-white/70">{nowPlaying.artist}</p>
          </div>
        </div>
      )}

      <div className="absolute bottom-8 right-8 text-right">
        <p className="text-4xl font-bold text-white">{pendingCount}</p>
        <p className="text-white/60">{t('tv.queue')}</p>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs">
        {t('tv.pressEsc')}
      </div>
    </div>
  )
}
