import { useState, useCallback, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import type { Event } from '../lib/insforge'
import type { Track } from '../lib/music-provider'

const FUNCTIONS_BASE = import.meta.env.VITE_INSFORGE_URL.replace('.us-east.insforge.app', '.function2.insforge.app')

export interface QueueItem {
    id: string
    event_id: string
    track_id: string
    spotify_track_id?: string
    title: string
    artist: string
    album_art?: string
    preview_url?: string
    votes: number
    voters: string[]
    provider: 'spotify' | 'youtube'
}

interface UseJukeboxQueueProps {
    event: Event
    provider: 'spotify' | 'youtube'
    showAlert: (msg: string, title?: string) => void
    emit: (event: string, payload: any) => void
    on: (event: string, callback: (payload: any) => void) => void
}

export function useJukeboxQueue({ event, provider, showAlert, emit, on }: UseJukeboxQueueProps) {
    const [queue, setQueue] = useState<QueueItem[]>([])

    const loadQueue = useCallback(async () => {
        const { data } = await insforge.database.from('jukebox_queue')
            .select('*')
            .eq('event_id', event.id)
            .eq('status', 'pending')
            .order('votes', { ascending: false })
            .order('created_at', { ascending: true })

        setQueue(data || [])
    }, [event.id])

    useEffect(() => {
        loadQueue()
        const handleJukeboxChange = () => loadQueue()

        on('INSERT_jukebox', handleJukeboxChange)
        on('UPDATE_jukebox', handleJukeboxChange)
    }, [event.id, on, loadQueue])

    const addToQueue = async (track: Track) => {
        const existing = queue.find(q =>
            q.track_id === track.id ||
            q.spotify_track_id === track.id ||
            (provider === 'spotify' && q.title.toLowerCase().trim() === track.title.toLowerCase().trim() && q.artist.toLowerCase().trim() === track.artist.toLowerCase().trim())
        )

        if (existing) {
            showAlert('Esta canción ya está en la cola')
            return false
        }

        let genre = 'unknown'
        if (provider === 'spotify') {
                try {
                    const res = await fetch(`${FUNCTIONS_BASE}/music-search`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ action: 'get_artist_genres', artists: [track.artist] })
                    })
                    const data = await res.json()
                if (data?.genres?.[track.artist] && data.genres[track.artist] !== 'unknown') {
                    genre = data.genres[track.artist]
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
            genre,
            preview_url: track.preview_url,
            votes: 1,
            voters: ['me'],
            provider
        })

        loadQueue()
        emit('queue:updated', { eventId: event.id })
        return true
    }

    const vote = async (item: QueueItem) => {
        setQueue(prevQueue => prevQueue.map(q => {
            if (q.id === item.id) return { ...q, votes: q.votes + 1 }
            return q
        }).sort((a, b) => b.votes - a.votes))

        try {
            const { error } = await insforge.database.from('jukebox_queue')
                .update({ votes: item.votes + 1 })
                .eq('id', item.id)
            if (error) throw error
        } catch (err) {
            setQueue(prevQueue => prevQueue.map(q => {
                if (q.id === item.id) return { ...q, votes: item.votes }
                return q
            }).sort((a, b) => b.votes - a.votes))
            showAlert('Error al actualizar el voto', 'Error')
        }
        emit('queue:updated', { eventId: event.id })
    }

    return { queue, addToQueue, vote }
}
