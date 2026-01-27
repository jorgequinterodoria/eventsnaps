
import { createClient } from "npm:@supabase/supabase-js";

export default async function handler(req: Request): Promise<Response> {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get("URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || "";
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request to know what config is needed
    // Default to spotify-token behavior if no body or specific action
    // But better: action = 'get_spotify_token' | 'get_youtube_key'
    
    // Parse request body once
    const body = await req.json().catch(() => ({ action: 'get_spotify_token' }));
    const { action, query } = body;

    // Fetch credentials from DB
    const { data: config, error: configError } = await supabase
      .from('admin_config')
      .select('key, value')
      .in('key', ['spotify_client_id', 'spotify_client_secret', 'youtube_api_key']);

    if (configError || !config) {
      throw new Error('Could not load configuration');
    }

    if (action === 'search_youtube') {
        const apiKey = Deno.env.get("YOUTUBE_API_KEY") || config.find(c => c.key === 'youtube_api_key')?.value;
        
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'YouTube API Key not configured' }), { 
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!query) {
             return new Response(JSON.stringify({ error: 'Query is required' }), { 
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=10`);
        const data = await res.json();
        
        if (!res.ok) {
            return new Response(JSON.stringify({ error: data.error?.message || 'YouTube search failed' }), {
                status: res.status,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        // Transform the response to match the Track interface
        const tracks = data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            album_art: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || null,
            provider: 'youtube'
        }));

        return new Response(JSON.stringify({ tracks }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (action === 'get_youtube_key') {
        const apiKey = Deno.env.get("YOUTUBE_API_KEY") || config.find(c => c.key === 'youtube_api_key')?.value;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'YouTube API Key not configured' }), { 
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify({ apiKey }), { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Default: Spotify Token Flow
    const clientId = config.find(c => c.key === 'spotify_client_id')?.value;
    const clientSecret = config.find(c => c.key === 'spotify_client_secret')?.value;

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Spotify credentials not configured' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Request Token from Spotify
    const authString = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || 'Failed to get Spotify token');
    }

    return new Response(JSON.stringify(tokenData), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
