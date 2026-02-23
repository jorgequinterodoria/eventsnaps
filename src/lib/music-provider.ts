
export interface Track {
    id: string;
    title: string;
    artist: string;
    album_art: string | null;
    preview_url: string | null;
    provider: 'spotify' | 'youtube';
}

export const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL
export const INSFORGE_ANON_KEY = import.meta.env.VITE_INSFORGE_ANON_KEY

/**
 * Search tracks using the server-side edge function.
 * Supports both Spotify (default) and YouTube providers.
 */
export async function searchTracks(query: string, provider: 'spotify' | 'youtube', _credentials?: any): Promise<Track[]> {
    const action = provider === 'spotify' ? 'search_spotify' : 'search_youtube'

    // Direct fetch to the InsForge edge function
    const res = await fetch(`${INSFORGE_URL}/functions/music-search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${INSFORGE_ANON_KEY}`,
        },
        body: JSON.stringify({ action, query }),
    })

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }))
        console.error(`${provider} search error:`, errorData)
        throw new Error(errorData.error || `Search failed (${res.status})`)
    }

    const data = await res.json()

    if (data?.error) {
        console.error(`${provider} search error:`, data.error)
        throw new Error(data.error)
    }

    return (data?.tracks || []) as Track[]
}
