import { supabase } from './supabase'
import { generateEventCode } from './utils'
import type { Event, Photo } from './supabase'

export async function createEvent(duration: '24h' | '72h', moderationEnabled: boolean = false, creatorId: string) {
  const code = generateEventCode()
  const expiresAt = new Date()
  
  if (duration === '24h') {
    expiresAt.setHours(expiresAt.getHours() + 24)
  } else {
    expiresAt.setHours(expiresAt.getHours() + 72)
  }

  const { data, error } = await supabase
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
  return data
}

export async function getEventByCode(code: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('code', code)
    .eq('status', 'active')
    .single()

  if (error) return null
  return data
}

export async function getEventPhotos(eventId: string): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('event_id', eventId)
    .order('uploaded_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function uploadPhoto(eventId: string, file: File, caption: string | undefined, uploaderId: string) {
  const fileName = `${Date.now()}-${file.name}`
  const filePath = `events/${eventId}/${fileName}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // Create photo record
  const { data: photo, error: dbError } = await supabase
    .from('photos')
    .insert({
      event_id: eventId,
      storage_path: filePath,
      caption: caption || null,
      uploaded_by: uploaderId
    })
    .select()
    .single()

  if (dbError) throw dbError

  // Check if moderation is enabled for this event
  const { data: event } = await supabase
    .from('events')
    .select('moderation_enabled')
    .eq('id', eventId)
    .single()

  if (event?.moderation_enabled) {
    // Add to moderation queue (RLS allows anon inserts)
    await supabase
      .from('moderation_queues')
      .insert({
        photo_id: photo.id,
        processed: false
      })
  }

  return photo
}

export async function getModerationQueue(eventId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('moderation_queues')
    .select(`
      *,
      photos!inner(*)
    `)
    .eq('photos.event_id', eventId)
    .eq('processed', false)
    .order('queued_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function moderatePhoto(photoId: string, action: 'approve' | 'reject', reason?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  
  // Update photo status
  const { error: photoError } = await supabase
    .from('photos')
    .update({ status: action === 'approve' ? 'approved' : 'rejected' })
    .eq('id', photoId)

  if (photoError) throw photoError

  // Mark moderation queue as processed
  await supabase
    .from('moderation_queues')
    .update({ processed: true })
    .eq('photo_id', photoId)

  // Record moderation action
  const { error: actionError } = await supabase
    .from('moderation_actions')
    .insert({
      photo_id: photoId,
      moderator_id: user?.id || 'anonymous',
      action,
      reason: reason || null
    })

  if (actionError) throw actionError
}

export async function getPhotoUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from('photos')
    .getPublicUrl(storagePath)
  
  return data.publicUrl
}
