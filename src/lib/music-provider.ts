import { insforge } from './insforge'

export interface Track {
    id: string;
    title: string;
    artist: string;
    album_art: string | null;
    preview_url: string | null;
    provider: 'spotify' | 'youtube';
}

const FUNCTIONS_BASE = import.meta.env.VITE_INSFORGE_URL.replace('.us-east.insforge.app', '.function2.insforge.app')

export async function searchTracks(query: string, provider: 'spotify' | 'youtube'): Promise<Track[]> {
    const action = provider === 'spotify' ? 'search_spotify' : 'search_youtube'

    const res = await fetch(`${FUNCTIONS_BASE}/music-search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, query })
    })
    const data = await res.json()

    if (!res.ok) throw new Error(data?.error || 'Search failed')
    if (data?.error) throw new Error(data.error)

    return (data?.tracks || []) as Track[]
}
