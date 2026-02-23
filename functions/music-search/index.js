import { createClient } from 'npm:@insforge/sdk';

export default async function(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, query, artists } = body;

    // Get Spotify credentials from admin_config table
    const client = createClient({
      baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
      anonKey: Deno.env.get('ANON_KEY'),
    });

    const { data: config, error: configError } = await client.database
      .from('admin_config')
      .select('key, value')
      .in('key', ['spotify_client_id', 'spotify_client_secret', 'youtube_api_key']);

    if (configError || !config) {
      throw new Error('Could not load configuration');
    }

    // --- YouTube Search ---
    if (action === 'search_youtube') {
      const apiKey = config.find(c => c.key === 'youtube_api_key')?.value;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'YouTube API Key not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=10`
      );
      const data = await res.json();

      if (!res.ok) {
        return new Response(JSON.stringify({ error: data.error?.message || 'YouTube search failed' }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tracks = data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        album_art: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || null,
        preview_url: null,
        provider: 'youtube',
      }));

      return new Response(JSON.stringify({ tracks }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Spotify Search ---
    if (action === 'search_spotify') {
      const clientId = config.find(c => c.key === 'spotify_client_id')?.value;
      const clientSecret = config.find(c => c.key === 'spotify_client_secret')?.value;

      if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({ error: 'Spotify credentials not configured. Add them in Admin Dashboard.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 1. Get access token using Client Credentials flow
      const authString = btoa(`${clientId}:${clientSecret}`);
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return new Response(
          JSON.stringify({ error: tokenData.error_description || 'Failed to get Spotify token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Search Spotify tracks
      const searchRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );

      const searchData = await searchRes.json();
      if (!searchRes.ok) {
        return new Response(
          JSON.stringify({ error: searchData.error?.message || 'Spotify search failed' }),
          { status: searchRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tracks = searchData.tracks.items.map((track) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album_art: track.album.images?.[0]?.url || null,
        preview_url: track.preview_url || null,
        provider: 'spotify',
      }));

      return new Response(JSON.stringify({ tracks }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Get Artist Genres ---
    if (action === 'get_artist_genres') {
      const clientId = config.find(c => c.key === 'spotify_client_id')?.value;
      const clientSecret = config.find(c => c.key === 'spotify_client_secret')?.value;

      if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({ genres: {} }), {
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (!artists || !Array.isArray(artists) || artists.length === 0) {
        return new Response(JSON.stringify({ genres: {} }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 1. Get access token
      const authString = btoa(`${clientId}:${clientSecret}`);
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return new Response(JSON.stringify({ genres: {} }), {
           status: 200,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2. Search each artist to get their genres
      const genresByArtist = {};
      const targetArtists = [...new Set(artists)].slice(0, 5); // Deduplicate and limit
      
      for (const artistName of targetArtists) {
        try {
          const searchRes = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent('artist:' + artistName)}&type=artist&limit=1`,
            { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
          );
          if (searchRes.ok) {
             const searchData = await searchRes.json();
             const foundArtist = searchData.artists?.items?.[0];
             if (foundArtist && foundArtist.genres?.length > 0) {
                 genresByArtist[artistName] = foundArtist.genres[0]; 
             } else {
                 genresByArtist[artistName] = 'unknown';
             }
          }
        } catch (e) {}
      }

      return new Response(JSON.stringify({ genres: genresByArtist }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Default: Get Spotify Token ---
    const clientId = config.find(c => c.key === 'spotify_client_id')?.value;
    const clientSecret = config.find(c => c.key === 'spotify_client_secret')?.value;

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Spotify credentials not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authString = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenResult = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenResult.error_description || 'Failed to get Spotify token');
    }

    return new Response(JSON.stringify(tokenResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
