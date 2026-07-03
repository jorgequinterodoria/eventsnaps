import { insforge } from './insforge'

export interface Track {
    id: string;
    title: string;
    artist: string;
    album_art: string | null;
    preview_url: string | null;
    provider: 'spotify' | 'youtube';
}

export async function searchTracks(query: string, provider: 'spotify' | 'youtube'): Promise<Track[]> {
    const action = provider === 'spotify' ? 'search_spotify' : 'search_youtube'

    const { data, error } = await insforge.functions.invoke('music-search', {
        body: { action, query }
    })

    if (error) throw new Error(error.message || 'Search failed')
    if (data?.error) throw new Error(data.error)

    return (data?.tracks || []) as Track[]
}
