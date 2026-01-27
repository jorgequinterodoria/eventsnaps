import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getSpotifyToken, searchTracks, type Track } from '@/lib/music-provider'
import { ThumbsUp, Music, Search, Plus, Youtube, Instagram } from 'lucide-react'
import type { Event } from '@/lib/supabase'
import debounce from 'lodash.debounce'

interface JukeboxPageProps {
  event: Event
}

export default function JukeboxPage({ event }: JukeboxPageProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [queue, setQueue] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  
  // Config state
  const [provider, setProvider] = useState<'spotify' | 'youtube'>('spotify')
  const [credentials, setCredentials] = useState<any>(null)

  // Initial Load & Config
  useEffect(() => {
    // Determine provider from event settings
    const loadSettings = async () => {
        try {
            const { data } = await supabase.from('jukebox_settings').select('provider').eq('event_id', event.id).single()
            const activeProvider = data?.provider || 'spotify'
            setProvider(activeProvider)

            if (activeProvider === 'spotify') {
                const token = await getSpotifyToken()
                setCredentials({ token })
            } else {
                // YouTube handled server-side
                setCredentials({}) 
            }
        } catch (e) {
            console.error('Error loading credentials', e)
        } finally {
            setInitializing(false)
        }
    }
    loadSettings()
  }, [event.id])
  
  // Realtime Queue
  useEffect(() => {
    loadQueue()
    const channel = supabase.channel(`jukebox:${event.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jukebox_queue', filter: `event_id=eq.${event.id}` }, (payload) => {
        console.log('Realtime update received:', payload)
        loadQueue()
      })
      .subscribe((status) => {
        console.log('Realtime connection status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [event.id])


  const loadQueue = async () => {
    const { data } = await supabase.from('jukebox_queue')
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
            // For Spotify we need credentials, for YouTube we don't (handled via env)
            // But we already set credentials to {} for YouTube in loadSettings or simple check provider
            const tracks = await searchTracks(q, provider, credentials)
            setResults(tracks)
        } catch (err) {
            console.error(err)
            // Silent fail or toast
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
          // Clear results if new search starts? Or keep old? 
          // Keeping old is better for UX until new arrives, but can correspond to old query.
          // Let's clear if empty, else debounce.
          debouncedSearch(val)
      } else {
          setResults([])
      }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      if (query.trim()) {
          debouncedSearch.cancel() // Cancel pending
          debouncedSearch(query)   // Execute immediately
          debouncedSearch.flush()
      }
  }

  const addToQueue = async (track: Track) => {
    // Check if already in queue (check both track_id and spotify_track_id for legacy)
    const existing = queue.find(q => q.track_id === track.id || q.spotify_track_id === track.id)
    if (existing) {
      alert('Esta canción ya está en la cola')
      return
    }

    // Optimistic add (optional, but good for consistency)
    // We'll leave the actual insert to handle it for now to avoid ID issues, 
    // unless we want to generate temp IDs. For now, let's just do the insert.
    await supabase.from('jukebox_queue').insert({
      event_id: event.id,
      track_id: track.id,
      spotify_track_id: track.id, // Backward compat
      title: track.title,
      artist: track.artist,
      album_art: track.album_art,
      genre: 'unknown', 
      votes: 1,
      voters: ['me'], // Simplified
      provider: provider
    })
    setQuery('')
    setResults([])
    loadQueue()
  }

  const vote = async (item: any) => {
    // Optimistic Update
    setQueue(prevQueue => prevQueue.map(q => {
        if (q.id === item.id) {
            return { ...q, votes: q.votes + 1 }
        }
        return q
    }).sort((a, b) => b.votes - a.votes)) // Re-sort optimistically

    try {
        const { error } = await supabase.from('jukebox_queue')
            .update({ votes: item.votes + 1 })
            .eq('id', item.id)
        
        if (error) throw error
    } catch (err) {
        console.error('Error voting:', err)
        // Revert on error
        setQueue(prevQueue => prevQueue.map(q => {
            if (q.id === item.id) {
                return { ...q, votes: item.votes } // Revert to original
            }
            return q
        }).sort((a, b) => b.votes - a.votes))
        alert('Error al actualizar el voto')
    }
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <h2 className="text-2xl font-bold flex items-center">
          {provider === 'youtube' ? <Youtube className="mr-2 text-red-600"/> : <Music className="mr-2 text-green-600"/>} 
          Playlist
        </h2>
        <h3 className="text-lg font-semibold flex items-center text-gray-700">
          <Instagram className="mr-2 text-pink-600"/> @jorgequinterodj
        </h3>
      </div>
      {/* Search */}
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
                <button onClick={() => addToQueue(track)} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 flex-shrink-0 ml-2">
                  <Plus className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Queue */}
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
               <div className="flex items-center ml-2 flex-shrink-0">
                 <button onClick={() => vote(item)} className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full">
                   <ThumbsUp className="h-4 w-4" />
                   <span className="font-bold">{item.votes}</span>
                 </button>
               </div>
            </div>
          ))}
          {queue.length === 0 && <p className="text-gray-500 text-center py-8">No hay canciones en la cola. ¡Sé el primero!</p>}
        </div>
      </div>
    </div>
  )
}
