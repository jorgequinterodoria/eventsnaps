import { insforge } from './insforge'
import { generateEventCode } from './utils'
import type { Event, Photo } from './insforge'

export interface ModerationQueueItem {
  id: string
  photo_id: string
  processed: boolean
  queued_at: string
  photos: Photo
  gemini_suggestion?: 'approve' | 'reject'
  confidence_score?: number
}

export async function createEvent(duration: '24h' | '72h', moderationEnabled: boolean = false, creatorId: string = 'anonymous') {
  const code = generateEventCode()
  const expiresAt = new Date()

  if (duration === '24h') {
    expiresAt.setHours(expiresAt.getHours() + 24)
  } else {
    expiresAt.setHours(expiresAt.getHours() + 72)
  }

  const { data, error } = await insforge.database
    .from('events')
    .insert({
      code,
      expires_at: expiresAt.toISOString(),
      moderation_enabled: moderationEnabled,
      creator_id: creatorId
    })
    .select()
    .single()

  if (error) throw error

  // Create default jukebox settings
  await insforge.database.from('jukebox_settings').insert({
    event_id: data.id,
    provider: 'spotify',
    is_active: true
  })

  return data
}

export async function getEventByCode(code: string): Promise<Event | null> {
  const { data, error } = await insforge.database
    .from('events')
    .select('*')
    .eq('code', code)
    .eq('status', 'active')
    .single()

  if (error) return null
  return data
}

export async function getEventPhotos(eventId: string): Promise<Photo[]> {
  const { data, error } = await insforge.database
    .from('photos')
    .select('*')
    .eq('event_id', eventId)
    .order('uploaded_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function uploadPhoto(eventId: string, file: File, caption?: string, uploaderId?: string) {
  uploaderId = uploaderId || 'anonymous'
  const fileName = `${Date.now()}-${file.name}`
  const filePath = `events/${eventId}/${fileName}`

  const { data: uploadData, error: uploadError } = await insforge.storage
    .from('photos')
    .upload(filePath, file)
  if (uploadError) throw uploadError

  const { data: event } = await insforge.database
    .from('events')
    .select('moderation_enabled')
    .eq('id', eventId)
    .single()

  const initialStatus: 'pending' | 'approved' = event?.moderation_enabled ? 'pending' : 'approved'

  const { data: photo, error: dbError } = await insforge.database
    .from('photos')
    .insert({
      event_id: eventId,
      storage_path: uploadData?.key || filePath,
      storage_url: uploadData?.url || null,
      caption: caption || null,
      uploaded_by: uploaderId,
      status: initialStatus
    })
    .select()
    .single()
  if (dbError) throw dbError

  if (event?.moderation_enabled) {
    await insforge.database
      .from('moderation_queues')
      .insert({
        photo_id: photo.id,
        processed: false
      })
  }

  return photo
}

export async function getModerationQueue(eventId: string): Promise<ModerationQueueItem[]> {
  const { data, error } = await insforge.database
    .from('moderation_queues')
    .select(`
      *,
      photos!inner(*)
    `)
    .eq('photos.event_id', eventId)
    .eq('processed', false)
    .order('queued_at', { ascending: true })

  if (error) throw error
  return (data as ModerationQueueItem[]) || []
}

export async function moderatePhoto(photoId: string, action: 'approve' | 'reject', reason?: string, moderatorId?: string) {
  const resolvedModeratorId = moderatorId || 'anonymous'

  // Update photo status
  const { error: photoError } = await insforge.database
    .from('photos')
    .update({ status: action === 'approve' ? 'approved' : 'rejected' })
    .eq('id', photoId)

  if (photoError) throw photoError

  // Mark moderation queue as processed
  await insforge.database
    .from('moderation_queues')
    .update({ processed: true })
    .eq('photo_id', photoId)

  // Record moderation action
  const { error: actionError } = await insforge.database
    .from('moderation_actions')
    .insert({
      photo_id: photoId,
      moderator_id: resolvedModeratorId,
      action,
      reason: reason || null
    })

  if (actionError) throw actionError
}

export async function setModerationAISuggestion(
  queueId: string,
  suggestion: 'approve' | 'reject' | null,
  confidence: number,
  errorMessage?: string
) {
  const { error } = await insforge.database
    .from('moderation_queues')
    .update({
      gemini_suggestion: suggestion,
      confidence_score: confidence,
      error_message: errorMessage || null
    })
    .eq('id', queueId)
  if (error) throw error
}

export async function getPhotoUrl(storagePath: string): Promise<string> {
  // First try to get the URL from the database
  const { data } = await insforge.database
    .from('photos')
    .select('storage_url')
    .eq('storage_path', storagePath)
    .single()

  if (data?.storage_url) {
    return data.storage_url
  }

  // Fallback: construct URL from base URL + bucket + path
  const baseUrl = import.meta.env.VITE_INSFORGE_URL
  return `${baseUrl}/api/storage/buckets/photos/objects/${encodeURIComponent(storagePath)}`
}

export async function downloadPhotoBlob(storagePath: string): Promise<Blob> {
  const { data, error } = await insforge.storage
    .from('photos')
    .download(storagePath)
  if (error) throw error
  return data
}
