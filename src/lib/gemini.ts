import { GoogleGenerativeAI } from '@google/generative-ai'
import { insforge } from './insforge'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)

export async function analyzePhotoForModeration(photoId: string, storagePath: string): Promise<{
  suggestion: 'approve' | 'reject'
  confidence: number
  reason: string
}> {
  try {
    // Download the photo blob
    const { data: blob, error } = await insforge.storage
      .from('photos')
      .download(storagePath)

    if (error || !blob) {
      return { suggestion: 'reject', confidence: 0.0, reason: 'Failed to download photo for analysis' }
    }

    // Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: blob.type || 'image/jpeg',
          data: base64
        }
      },
      {
        text: `Analyze this photo for content moderation at an event. 
Respond in JSON format only: {"suggestion": "approve" or "reject", "confidence": 0.0-1.0, "reason": "brief explanation"}
Approve photos that are appropriate for a public event (people, scenery, food, celebrations).
Reject photos with explicit content, violence, hate symbols, or clearly inappropriate material.`
      }
    ])

    const responseText = result.response.text()
    // Try to parse JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        suggestion: parsed.suggestion === 'reject' ? 'reject' : 'approve',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        reason: parsed.reason || 'Analysis completed'
      }
    }

    return { suggestion: 'approve', confidence: 0.7, reason: 'Analysis completed (fallback)' }
  } catch {
    return { suggestion: 'reject', confidence: 0.0, reason: 'AI Analysis Error - Flagged for manual review' }
  }
}
