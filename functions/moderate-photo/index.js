// Edge Function: moderate-photo
// Runs server-side. Gemini API key is read from InsForge admin_config table
// (key = 'gemini_api_key'), with fallback to Deno.env GEMINI_API_KEY.
// Accepts: { storagePath: string, insforgeUrl: string, anonKey: string }
// Returns: { suggestion: 'approve'|'reject', confidence: number, reason: string }

/**
 * Fetch the Gemini API key from admin_config table, fallback to env var.
 */
async function getGeminiKey(insforgeUrl, anonKey) {
  try {
    const url = `${insforgeUrl}/api/database/records/admin_config?select=value&key=eq.gemini_api_key&limit=1`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${anonKey}` }
    })
    if (res.ok) {
      const rows = await res.json()
      const row = Array.isArray(rows) ? rows[0] : (rows?.data?.[0])
      if (row?.value) return row.value
    }
  } catch { /* fall through */ }
  // Fallback to Deno environment variable
  return Deno.env.get('GEMINI_API_KEY') ?? ''
}

async function downloadPhoto(insforgeUrl, anonKey, storagePath) {
  const url = `${insforgeUrl}/api/storage/buckets/photos/objects/${encodeURIComponent(storagePath)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${anonKey}` }
  })
  if (!res.ok) throw new Error(`Storage download failed: ${res.status}`)
  return res
}

async function analyzeWithGemini(base64, mimeType, apiKey) {
  if (!apiKey) throw new Error('Gemini API key not configured')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        {
          text: `Analyze this photo for content moderation at an event.
Respond in JSON format only: {"suggestion": "approve" or "reject", "confidence": 0.0-1.0, "reason": "brief explanation"}
Approve photos that are appropriate for a public event (people, scenery, food, celebrations).
Reject photos with explicit content, violence, hate symbols, or clearly inappropriate material.`
        }
      ]
    }]
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => res.status.toString())
    throw new Error(`Gemini API error ${res.status}: ${errText}`)
  }
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    const parsed = JSON.parse(match[0])
    return {
      suggestion: parsed.suggestion === 'reject' ? 'reject' : 'approve',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      reason: parsed.reason || 'Analysis completed'
    }
  }
  return { suggestion: 'approve', confidence: 0.7, reason: 'Analysis completed (fallback)' }
}

module.exports = async function handler(request) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...CORS }
    })
  }

  try {
    const { storagePath, insforgeUrl, anonKey } = await request.json()

    if (!storagePath || !insforgeUrl || !anonKey) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS }
      })
    }

    // 1. Resolve Gemini key (admin_config takes priority over env var)
    const apiKey = await getGeminiKey(insforgeUrl, anonKey)
    if (!apiKey) {
      return new Response(
        JSON.stringify({ suggestion: null, confidence: 0.0, errorMessage: 'Gemini API key no configurada — revisar panel admin' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
      )
    }

    // 2. Download photo from InsForge storage
    const photoRes = await downloadPhoto(insforgeUrl, anonKey, storagePath)
    const arrayBuffer = await photoRes.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
    const base64 = btoa(binary)
    const mimeType = photoRes.headers.get('content-type') || 'image/jpeg'

    // 3. Analyze with Gemini
    const result = await analyzeWithGemini(base64, mimeType, apiKey)

    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json', ...CORS }
    })
  } catch (err) {
    console.error('[moderate-photo]', err?.message ?? err)
    return new Response(
      JSON.stringify({
        suggestion: null,
        confidence: 0.0,
        errorMessage: `Error en análisis: ${err?.message ?? 'desconocido'}`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
    )
  }
}
