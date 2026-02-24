import { insforge } from './insforge'

/**
 * analyzePhotoForModeration
 * Delegates the Gemini call to the server-side edge function `moderate-photo`
 * so the API key is never exposed in the frontend bundle.
 */
export async function analyzePhotoForModeration(
  _photoId: string,
  storagePath: string
): Promise<{
  suggestion: 'approve' | 'reject' | null
  confidence: number
  reason: string
  errorMessage?: string
}> {
  try {
    const insforgeUrl = import.meta.env.VITE_INSFORGE_URL
    const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY

    // Use the official SDK to invoke the edge function
    const { data: resultData, error } = await insforge.functions.invoke('moderate-photo', {
      body: { storagePath, insforgeUrl, anonKey }
    })

    if (error) throw new Error(`Edge function error: ${error.message}`)
    if (!resultData) throw new Error('No data returned from edge function')

    // The SDK automatically parses the JSON response
    const data = resultData as any

    return {
      suggestion: data.suggestion === 'reject' ? 'reject' : 'approve',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.8,
      reason: data.reason ?? 'Analysis completed',
      errorMessage: data.confidence === 0.0 ? data.reason : undefined
    }
  } catch (err: any) {
    // Fail-open: flag for manual review rather than blocking
    return {
      suggestion: null,
      confidence: 0.0,
      reason: 'Error en análisis de IA — revisar manualmente',
      errorMessage: err?.message || 'Unknown network error'
    }
  }
}
