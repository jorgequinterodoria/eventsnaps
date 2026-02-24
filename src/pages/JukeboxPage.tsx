import { useState, useEffect, useCallback } from 'react'
import { insforge } from '@/lib/insforge'
import { searchTracks, type Track } from '@/lib/music-provider'
import { ThumbsUp, Music, Search, Plus, Youtube, Instagram } from 'lucide-react'
import type { Event } from '@/lib/insforge'
import debounce from 'lodash.debounce'
import { useInsforgeRealtime } from '@/hooks/useInsforgeRealtime'
import WaveVisualizer from '@/components/WaveVisualizer'
import QueueAnalytics from '@/components/QueueAnalytics'
import { INSFORGE_URL, INSFORGE_ANON_KEY } from '@/lib/music-provider'
import { useAlert } from '@/contexts/AlertContext'

interface JukeboxPageProps {
  event: Event
  creatorProfile?: any
}

export default function JukeboxPage({ event, creatorProfile }: JukeboxPageProps) {
  const [query, setQuery] = useState('')
  const { showAlert } = useAlert()
  const [results, setResults] = useState<Track[]>([])
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  
  // Config state
  const [provider, setProvider] = useState<'spotify' | 'youtube'>('spotify')
  const [credentials, setCredentials] = useState<any>(null)
  const { on, emit } = useInsforgeRealtime(event.id)
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null)
  const isAdmin = typeof window !== 'undefined' && !!localStorage.getItem('admin_token')

  // Initial Load & Config
  useEffect(() => {
    // Determine provider from event settings
    const loadSettings = async () => {
        try {
            const { data } = await insforge.database.from('jukebox_settings').select('provider').eq('event_id', event.id).single()
            const activeProvider = data?.provider || 'spotify'
            setProvider(activeProvider)
            setCredentials({}) 
        } catch (e) {
            console.error('Error loading credentials', e)
        } finally {
            setInitializing(false)
        }
    }
    loadSettings()
  }, [event.id])
  
  // Realtime Queue via InsForge
  useEffect(() => {
    loadQueue()

    // Listen for jukebox realtime events
    const handleJukeboxChange = () => {
      loadQueue()
    }
    on('INSERT_jukebox', handleJukeboxChange)
    on('UPDATE_jukebox', handleJukeboxChange)

    return () => {
      // Cleanup not strictly needed since InsForge handles it, but good practice
    }
  }, [event.id, on])


  const loadQueue = async () => {
    const { data } = await insforge.database.from('jukebox_queue')
      .select('*')
      .eq('event_id', event.id)
      .eq('status', 'pending')
      .order('votes', { ascending: false })
      .order('created_at', { ascending: true })
    
    setQueue(data || [])
  }

  const debouncedSearch = useCallback(
    debounce(async (q: string) => {
        if (!q.trim()) return
        setLoading(true)
        try {
            const tracks = await searchTracks(q, provider, credentials)
            setResults(tracks)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, 500),
    [provider, credentials]
  )

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      setQuery(val)
      if (val.trim()) {
          debouncedSearch(val)
      } else {
          setResults([])
      }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim()) {
          debouncedSearch.cancel()
          debouncedSearch(query)
          debouncedSearch.flush()
      }
  }

  const addToQueue = async (track: Track) => {
    // Check if already in queue
    const existing = queue.find(q => 
      q.track_id === track.id || 
      q.spotify_track_id === track.id ||
      (provider === 'spotify' && q.title.toLowerCase().trim() === track.title.toLowerCase().trim() && q.artist.toLowerCase().trim() === track.artist.toLowerCase().trim())
    )
    if (existing) {
      showAlert('Esta canción ya está en la cola')
      return
    }

    // Fetch genre if Spotify
    let genre = 'unknown'
    if (provider === 'spotify') {
      try {
        const res = await fetch(`${INSFORGE_URL}/functions/music-search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${INSFORGE_ANON_KEY}`,
            },
            body: JSON.stringify({ action: 'get_artist_genres', artists: [track.artist] }),
        })
        if (res.ok) {
            const data = await res.json()
            if (data?.genres?.[track.artist] && data.genres[track.artist] !== 'unknown') {
                genre = data.genres[track.artist]
            }
        }
      } catch (e) {
        console.error('Failed to fetch genre', e)
      }
    }

    await insforge.database.from('jukebox_queue').insert({
      event_id: event.id,
      track_id: track.id,
      spotify_track_id: track.id,
      title: track.title,
      artist: track.artist,
      album_art: track.album_art,
      genre: genre, 
      preview_url: track.preview_url,
      votes: 1,
      voters: ['me'],
      provider: provider
    })
    setQuery('')
    setResults([])
    loadQueue()
    emit('queue:updated', { eventId: event.id })
  }

  const vote = async (item: any) => {
    // Optimistic Update
    setQueue(prevQueue => prevQueue.map(q => {
        if (q.id === item.id) {
            return { ...q, votes: q.votes + 1 }
        }
        return q
    }).sort((a, b) => b.votes - a.votes))

    try {
        const { error } = await insforge.database.from('jukebox_queue')
            .update({ votes: item.votes + 1 })
            .eq('id', item.id)
        
        if (error) throw error
    } catch (err) {
        console.error('Error voting:', err)
        setQueue(prevQueue => prevQueue.map(q => {
            if (q.id === item.id) {
                return { ...q, votes: item.votes }
            }
            return q
        }).sort((a, b) => b.votes - a.votes))
        showAlert('Error al actualizar el voto', 'Error')
    }
    emit('queue:updated', { eventId: event.id })
  }

  useEffect(() => {
    on('nowPlaying:set', (payload: any) => {
      if (payload?.eventId === event.id) {
        setNowPlaying(payload.track)
      }
    })
  }, [on, event.id])

  const setNowPlayingTrack = (track: Track) => {
    setNowPlaying(track)
    emit('nowPlaying:set', { eventId: event.id, track })
  }

  if (initializing) {
    return (
        <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
            <p>Conectando con {provider === 'youtube' ? 'YouTube' : 'Spotify'}...</p>
        </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {nowPlaying && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {nowPlaying.album_art && <img src={nowPlaying.album_art} className="h-14 w-14 rounded mr-3 object-cover" />}
              <div className="min-w-0">
                <div className="font-bold truncate">{nowPlaying.title}</div>
                <div className="text-gray-600 text-sm truncate">{nowPlaying.artist}</div>
              </div>
            </div>
            {nowPlaying.preview_url && (
              <audio src={nowPlaying.preview_url} autoPlay controls controlsList="nodownload noplaybackrate" className="h-8 w-full max-w-[200px] opacity-70 hover:opacity-100 transition-opacity" />
            )}
          </div>
          <div className="mt-4">
            <WaveVisualizer />
          </div>
        </div>
      )}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <h2 className="text-2xl font-bold flex items-center">
          {provider === 'youtube' ? <Youtube className="mr-2 text-red-600"/> : <Music className="mr-2 text-green-600"/>} 
          Playlist {creatorProfile?.full_name ? `de ${creatorProfile.full_name}` : ''}
        </h2>
        <h3 className="text-lg font-semibold flex items-center text-gray-700">
          <a href={`https://www.instagram.com/${creatorProfile?.instagram_username || 'jorgequinterodj'}/`} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-pink-600 transition-colors">
            <Instagram className="mr-2 text-pink-600"/> @{creatorProfile?.instagram_username || 'jorgequinterodj'}
          </a>
        </h3>
      </div>
      {/* Search */}
      <form onSubmit={handleManualSubmit} className="mb-6 relative">
        <input 
          type="text" 
          value={query}
          onChange={handleSearchChange}
          placeholder={`Buscar en ${provider === 'youtube' ? 'YouTube' : 'Spotify'}...`}
          className="w-full p-3 pl-10 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
        />
        <Search className={`absolute left-3 top-3.5 text-gray-400 h-5 w-5 ${loading ? 'animate-pulse text-blue-500' : ''}`} />
        {loading && <div className="absolute right-3 top-3.5 animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
      </form>

      {/* Results */}
      {results.length > 0 && (
        <div className="mb-8 bg-white rounded-lg shadow overflow-hidden">
          <h3 className="p-3 bg-gray-50 font-semibold border-b">Resultados</h3>
          <ul>
            {results.map(track => (
              <li key={track.id} className="p-3 border-b flex justify-between items-center hover:bg-gray-50">
                <div className="flex items-center flex-1 min-w-0">
                  {track.album_art ? (
                       <img src={track.album_art} className="h-10 w-10 rounded mr-3 object-cover flex-shrink-0" />
                  ) : (
                      <div className="h-10 w-10 bg-gray-200 rounded mr-3 flex items-center justify-center flex-shrink-0">
                          <Music className="h-5 w-5 text-gray-400" />
                      </div>
                  )}
                  <div className="overflow-hidden">
                    <div className="font-medium truncate">{track.title}</div>
                    <div className="text-sm text-gray-500 truncate">{track.artist}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button onClick={() => addToQueue(track)} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200">
                  <Plus className="h-5 w-5" />
                </button>
                {isAdmin && (
                  <button onClick={() => setNowPlayingTrack(track)} className="px-3 py-2 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
                    Now Playing
                  </button>
                )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Queue & Analytics */}
      <div>
        <h3 className="text-xl font-semibold mb-3">Cola de Reproducción</h3>
        
        <div className="space-y-3">
          {queue.map((item, index) => (
            <div key={item.id} className={`bg-white p-4 rounded-lg shadow flex justify-between items-center ${index === 0 ? 'border-2 border-blue-500' : ''}`}>
               <div className="flex items-center overflow-hidden">
                 <span className="text-2xl font-bold text-gray-300 mr-4 w-6 flex-shrink-0">{index + 1}</span>
                 {item.album_art && <img src={item.album_art} className="h-12 w-12 rounded mr-3 object-cover flex-shrink-0" />}
                 <div className="min-w-0">
                   <div className="font-bold truncate">{item.title}</div>
                   <div className="text-gray-600 text-sm truncate">{item.artist}</div>
                   <div className="text-xs text-gray-400 mt-0.5 capitalize flex items-center">
                       {item.provider === 'youtube' && <Youtube className="h-3 w-3 mr-1 inline text-red-500" />}
                       {item.provider === 'spotify' && <Music className="h-3 w-3 mr-1 inline text-green-500" />}
                       {item.provider}
                   </div>
                 </div>
               </div>
               <div className="flex items-center ml-2 flex-shrink-0 gap-2">
                 {isAdmin && (
                   <button onClick={() => setNowPlayingTrack({
                     id: item.track_id,
                     title: item.title,
                     artist: item.artist,
                     album_art: item.album_art,
                     preview_url: item.preview_url,
                     provider: item.provider
                   } as Track)} className="px-3 py-1 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
                     Play
                   </button>
                 )}
                 <button onClick={() => vote(item)} className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full">
                   <ThumbsUp className="h-4 w-4" />
                   <span className="font-bold">{item.votes}</span>
                 </button>
               </div>
            </div>
          ))}
          {queue.length === 0 && <p className="text-gray-500 text-center py-8">No hay canciones en la cola. ¡Sé el primero!</p>}
        </div>

        {queue.length > 0 && (
          <QueueAnalytics queue={queue} provider={provider} eventId={event.id} />
        )}
      </div>
    </div>
  )
}
