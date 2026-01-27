import { supabase } from './supabase'

export async function analyzePhotoForModeration(photoId: string, storagePath: string): Promise<{
  suggestion: 'approve' | 'reject'
  confidence: number
  reason: string
}> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-photo', {
      body: { photoId, storagePath }
    })
    if (error || !data) {
      return { suggestion: 'reject', confidence: 0.0, reason: 'AI Analysis Error - Flagged for manual review' }
    }
    return {
      suggestion: data.suggestion === 'reject' ? 'reject' : 'approve',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.8,
      reason: data.reason || 'Analysis completed'
    }
  } catch {
    return { suggestion: 'reject', confidence: 0.0, reason: 'AI Analysis Error - Flagged for manual review' }
  }
}
