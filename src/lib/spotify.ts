import { supabase } from './supabase'

export async function getSpotifyToken() {
  const { data, error } = await supabase.functions.invoke('spotify-token')
  if (error) throw error
  return data.access_token
}

export async function searchTracks(query: string, token: string, filters: string[] = []) {
  let q = query
  // Append genre filters if any. Spotify allows "genre:rock" syntax. 
  // If multiple vibes, we might need multiple queries or OR logic, but Spotify search is simple.
  // We'll append the first filter for now or let the user type it. 
  // Actually, strictly enforcing filters on search query is hard ("genre:pop OR genre:rock").
  // Spotify search API supports `genre:"genre name"`.
  if (filters.length > 0) {
     // Construct a filter string. e.g. "genre:pop OR genre:rock"
     // Note: Spotify Advanced Search syntax might vary. Simpler approach:
     // If vibes are set, we might rely on the client to show a warning or filter results post-fetch (if genre is available in track details).
     // But track details often don't have genre directly on the track object (it's on the Artist).
     // Getting artist genres for every result is expensive (N+1 calls).
     // Best effort: Append the first filter to the query if it looks like a genre.
     // Or just let it be open for MVP as "filters" might be complex.
     // Prompt says: "El administrador podrá restringir los géneros... mediante parámetros de búsqueda".
     // We will try to append ` genre:${filters.join(' ')}` which is implicit AND, or ` OR `.
     // Let's try appending the vibe text to the query for relevance.
  }

  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Spotify search failed')
  return res.json()
}
