import { createClient } from 'npm:@insforge/sdk';

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

async function getSpotifyToken(clientId, clientSecret) {
  const authString = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || 'Failed to get Spotify token');
  }
  return data.access_token;
}

async function handleYoutubeSearch(query, apiKey) {
  if (!apiKey) return { status: 400, data: { error: 'YouTube API Key not configured' } };
  if (!query) return { status: 400, data: { error: 'Query is required' } };

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=10`
  );
  const data = await res.json();
  if (!res.ok) {
    return { status: res.status, data: { error: data.error?.message || 'YouTube search failed' } };
  }

  const tracks = data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    album_art: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || null,
    preview_url: null,
    provider: 'youtube',
  }));

  return { status: 200, data: { tracks } };
}

async function handleSpotifySearch(query, clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    return { status: 400, data: { error: 'Spotify credentials not configured.' } };
  }
  if (!query) return { status: 400, data: { error: 'Query is required' } };

  try {
    const token = await getSpotifyToken(clientId, clientSecret);
    const searchRes = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const searchData = await searchRes.json();
    if (!searchRes.ok) {
      return { status: searchRes.status, data: { error: searchData.error?.message || 'Spotify search failed' } };
    }

    const tracks = searchData.tracks.items.map((track) => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album_art: track.album.images?.[0]?.url || null,
      preview_url: track.preview_url || null,
      provider: 'spotify',
    }));
    return { status: 200, data: { tracks } };
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

async function getArtistGenres(artists, clientId, clientSecret) {
  if (!clientId || !clientSecret || !Array.isArray(artists) || artists.length === 0) {
    return { status: 200, data: { genres: {} } };
  }

  try {
    const token = await getSpotifyToken(clientId, clientSecret);
    const genresByArtist = {};
    const targetArtists = [...new Set(artists)].slice(0, 5); // Deduplicate and limit
    
    for (const artistName of targetArtists) {
      try {
        const searchRes = await fetch(
          `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent('artist:' + artistName)}&type=artist&limit=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (searchRes.ok) {
           const searchData = await searchRes.json();
           const foundArtist = searchData.artists?.items?.[0];
           genresByArtist[artistName] = foundArtist && foundArtist.genres?.length > 0
             ? foundArtist.genres[0]
             : 'unknown';
        }
      } catch (e) {
        /* intentional fall through: skip failed artist lookup */
      }
    }
    return { status: 200, data: { genres: genresByArtist } };
  } catch (error) {
    return { status: 200, data: { genres: {} } }; // Fail gracefully on token error
  }
}

export default async function(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      /* intentional fall through wrapper */
    }
    const { action, query, artists } = body;

    const client = createClient({
      baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
      anonKey: Deno.env.get('ANON_KEY'),
    });

    const { data: config, error: configError } = await client.database
      .from('admin_config')
      .select('key, value')
      .in('key', ['spotify_client_id', 'spotify_client_secret', 'youtube_api_key']);

    if (configError || !config) throw new Error('Could not load configuration');

    const clientId = config.find(c => c.key === 'spotify_client_id')?.value;
    const clientSecret = config.find(c => c.key === 'spotify_client_secret')?.value;
    const youtubeKey = config.find(c => c.key === 'youtube_api_key')?.value;

    let result;
    if (action === 'search_youtube') {
      result = await handleYoutubeSearch(query, youtubeKey);
    } else if (action === 'search_spotify') {
      result = await handleSpotifySearch(query, clientId, clientSecret);
    } else if (action === 'get_artist_genres') {
      result = await getArtistGenres(artists, clientId, clientSecret);
    } else {
      // Default: Get token
      if (!clientId || !clientSecret) {
         result = { status: 400, data: { error: 'Spotify credentials not configured' } };
      } else {
         try {
           const token = await getSpotifyToken(clientId, clientSecret);
           result = { status: 200, data: { access_token: token } };
         } catch(e) {
           result = { status: 500, data: { error: e.message } };
         }
      }
    }

    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
