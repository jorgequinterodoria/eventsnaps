import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { insforge } from '../lib/insforge'
import { type Track } from '../lib/music-provider'
import { ThumbsUp, Music, Search, Youtube, Instagram } from 'lucide-react'
import type { Event } from '../lib/insforge'
import { useInsforgeRealtime } from '../hooks/useInsforgeRealtime'
import WaveVisualizer from '../components/WaveVisualizer'
import QueueAnalytics from '../components/QueueAnalytics'
import { useAlert } from '../contexts/AlertContext'
import { type UserProfile } from '../types/admin'
import { TrackItem } from '../components/jukebox/TrackItem'
import { useMusicSearch } from '../hooks/useMusicSearch'
import { useJukeboxQueue, type QueueItem } from '../hooks/useJukeboxQueue'

interface JukeboxPageProps {
  event: Event
  creatorProfile?: UserProfile
}

export default function JukeboxPage({ event, creatorProfile }: JukeboxPageProps) {
  const { t } = useTranslation()
  const { showAlert } = useAlert()
  const [initializing, setInitializing] = useState(true)
  const [provider, setProvider] = useState<'spotify' | 'youtube'>('spotify')
  const { on, emit } = useInsforgeRealtime(event.id)
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null)
  const isAdmin = typeof window !== 'undefined' && !!localStorage.getItem('admin_token')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await insforge.database
          .from('jukebox_settings')
          .select('provider')
          .eq('event_id', event.id)
          .single()
        setProvider(data?.provider || 'spotify')
      } catch {
        /* intentional – fall back to default provider */
      } finally {
        setInitializing(false)
      }
    }
    loadSettings()
  }, [event.id])

  const { query, results, loading, handleSearchChange, handleManualSubmit, clearSearch } =
    useMusicSearch(provider)

  const { queue, addToQueue, vote } = useJukeboxQueue({ event, provider, showAlert, emit, on })

  const handleAddToQueue = async (track: Track) => {
    const success = await addToQueue(track)
    if (success) clearSearch()
  }

  useEffect(() => {
    on('nowPlaying:set', (payload: { eventId: string; track: Track }) => {
      if (payload?.eventId === event.id) setNowPlaying(payload.track)
    })
  }, [on, event.id])

  const setNowPlayingTrack = (track: Track) => {
    setNowPlaying(track)
    emit('nowPlaying:set', { eventId: event.id, track })
  }

  if (initializing) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
        <p>Conectando con {provider === 'youtube' ? 'YouTube' : 'Spotify'}...</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {nowPlaying && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {nowPlaying.album_art && (
                <img src={nowPlaying.album_art} className="h-14 w-14 rounded mr-3 object-cover" />
              )}
              <div className="min-w-0">
                <div className="font-bold truncate">{nowPlaying.title}</div>
                <div className="text-gray-600 dark:text-gray-400 text-sm truncate">{nowPlaying.artist}</div>
              </div>
            </div>
            {nowPlaying.preview_url && (
              <audio
                src={nowPlaying.preview_url}
                autoPlay
                controls
                controlsList="nodownload noplaybackrate"
                className="h-8 w-full max-w-[200px] opacity-70 hover:opacity-100 transition-opacity"
              />
            )}
          </div>
          <div className="mt-4">
            <WaveVisualizer />
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <h2 className="text-2xl font-bold flex items-center">
          {provider === 'youtube' ? (
            <Youtube className="mr-2 text-red-600" />
          ) : (
            <Music className="mr-2 text-green-600" />
          )}
          Playlist {creatorProfile?.full_name ? `de ${creatorProfile.full_name}` : ''}
        </h2>
        <h3 className="text-lg font-semibold flex items-center text-gray-700 dark:text-gray-300">
          <a
            href={`https://www.instagram.com/${creatorProfile?.instagram_username || 'jorgequinterodj'}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:text-pink-600 transition-colors"
          >
            <Instagram className="mr-2 text-pink-600" />
            @{creatorProfile?.instagram_username || 'jorgequinterodj'}
          </a>
        </h3>
      </div>

      {/* Search */}
      <form onSubmit={handleManualSubmit} className="mb-6 relative">
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder={t('jukebox.searchSongs')}
          className="w-full p-3 pl-10 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
        <Search
          className={`absolute left-3 top-3.5 text-gray-400 h-5 w-5 ${loading ? 'animate-pulse text-blue-500' : ''}`}
        />
        {loading && (
          <div className="absolute right-3 top-3.5 animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        )}
      </form>

      {/* Results */}
      {results.length > 0 && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <h3 className="p-3 bg-gray-50 dark:bg-gray-900 font-semibold border-b dark:border-gray-700">Resultados</h3>
          <ul>
            {results.map((track) => (
              <TrackItem
                key={track.id}
                track={track}
                isAdmin={isAdmin}
                onAdd={handleAddToQueue}
                onPlay={setNowPlayingTrack}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Queue & Analytics */}
      <div>
        <h3 className="text-xl font-semibold mb-3">{t('jukebox.queue')}</h3>
        <div className="space-y-3">
          {queue.map((item: QueueItem, index: number) => (
            <div
              key={item.id}
              className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex justify-between items-center ${index === 0 ? 'border-2 border-blue-500' : ''}`}
            >
              <div className="flex items-center overflow-hidden">
                <span className="text-2xl font-bold text-gray-300 dark:text-gray-500 mr-4 w-6 flex-shrink-0">
                  {index + 1}
                </span>
                {item.album_art && (
                  <img
                    src={item.album_art}
                    className="h-12 w-12 rounded mr-3 object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="font-bold truncate">{item.title}</div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm truncate">{item.artist}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize flex items-center">
                    {item.provider === 'youtube' && (
                      <Youtube className="h-3 w-3 mr-1 inline text-red-500" />
                    )}
                    {item.provider === 'spotify' && (
                      <Music className="h-3 w-3 mr-1 inline text-green-500" />
                    )}
                    {item.provider}
                  </div>
                </div>
              </div>
              <div className="flex items-center ml-2 flex-shrink-0 gap-2">
                {isAdmin && (
                  <button
                    onClick={() =>
                      setNowPlayingTrack({
                        id: item.track_id,
                        title: item.title,
                        artist: item.artist,
                        album_art: item.album_art,
                        preview_url: item.preview_url,
                        provider: item.provider,
                      } as Track)
                    }
                    className="px-3 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                  >
{t('jukebox.play')}
                  </button>
                )}
                <button
                  onClick={() => vote(item)}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span className="font-bold">{item.votes}</span>
                </button>
              </div>
            </div>
          ))}
          {queue.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              {t('jukebox.noTracks')}
            </p>
          )}
        </div>

        {queue.length > 0 && <QueueAnalytics queue={queue} eventId={event.id} />}
      </div>
    </div>
  )
}
