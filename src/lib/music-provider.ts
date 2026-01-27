import { supabase } from './supabase'

export interface Track {
    id: string;
    title: string;
    artist: string;
    album_art: string | null;
    provider: 'spotify' | 'youtube';
}

export async function getSpotifyToken() {
    const { data, error } = await supabase.functions.invoke('spotify-token', {
        body: { action: 'get_spotify_token' }
    })
    if (error) throw error
    return data.access_token
}

export async function searchTracks(query: string, provider: 'spotify' | 'youtube', credentials: any): Promise<Track[]> {
    if (provider === 'spotify') {
        return searchSpotify(query, credentials.token)
    } else {
        // For YouTube, we don't need credentials passed from here anymore, 
        // as the key is handled in the backend. 
        // We might want to clean up the signature later, but for now we ignore credentials.apiKey
        return searchYoutube(query)
    }
}

async function searchSpotify(query: string, token: string): Promise<Track[]> {
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    if (!res.ok) throw new Error('Spotify search failed')
    const data = await res.json()

    return data.tracks.items.map((item: any) => ({
        id: item.id,
        title: item.name,
        artist: item.artists[0].name,
        album_art: item.album.images[0]?.url || null,
        provider: 'spotify'
    }))
}

async function searchYoutube(query: string): Promise<Track[]> {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!apiKey) {
        throw new Error('VITE_YOUTUBE_API_KEY is not defined')
    }

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=10`)

    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'YouTube search failed')
    }

    const data = await res.json()

    return data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        album_art: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || null,
        provider: 'youtube'
    }))
}
