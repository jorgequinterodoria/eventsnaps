import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '')

export async function analyzePhotoForModeration(imageUrl: string): Promise<{
  suggestion: 'approve' | 'reject'
  confidence: number
  reason: string
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    const prompt = `Analyze this image for content moderation. Determine if it's appropriate for a general social event photo sharing platform. Consider:
    
    APPROVE if the image contains:
    - People at social events, parties, gatherings
    - Food, drinks, decorations
    - Venues, locations, landscapes
    - Group photos, selfies
    - General event documentation
    
    REJECT if the image contains:
    - Inappropriate nudity or sexual content
    - Violence, weapons, or disturbing content
    - Hate symbols or offensive material
    - Illegal activities
    - Spam or irrelevant content
    
    Respond with exactly: APPROVE or REJECT followed by a confidence score (0-1) and a brief reason.
    Example format: "APPROVE 0.95 Family gathering photo"
    `

    const result = await model.generateContent([prompt, { inlineData: { data: imageUrl, mimeType: 'image/jpeg' } }])
    const response = await result.response
    const text = response.text().trim()
    
    const parts = text.split(' ')
    const suggestion = parts[0].toLowerCase() as 'approve' | 'reject'
    const confidence = parseFloat(parts[1]) || 0.8
    const reason = parts.slice(2).join(' ') || 'Content analysis completed'
    
    return {
      suggestion: suggestion === 'approve' ? 'approve' : 'reject',
      confidence: Math.max(0, Math.min(1, confidence)),
      reason
    }
  } catch (error) {
    console.error('Gemini analysis error:', error)
    // Default to approval if analysis fails
    return {
      suggestion: 'approve',
      confidence: 0.5,
      reason: 'Analysis failed - defaulting to approve'
    }
  }
}

export async function processModerationQueue(photoUrl: string): Promise<{
  suggestion: 'approve' | 'reject'
  confidence: number
  reason: string
}> {
  return analyzePhotoForModeration(photoUrl)
}