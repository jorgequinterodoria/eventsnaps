import { createClient } from '@insforge/sdk'

const insforgeUrl = import.meta.env.VITE_INSFORGE_URL
const insforgeAnonKey = import.meta.env.VITE_INSFORGE_ANON_KEY

export const insforge = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey
})

// ---- Type Definitions ----

export type Event = {
    id: string
    code: string
    created_at: string
    expires_at: string
    creator_id: string
    moderation_enabled: boolean
    status: 'active' | 'expired'
}

export type Photo = {
    id: string
    event_id: string
    storage_path: string
    storage_url: string | null
    caption: string | null
    status: 'pending' | 'approved' | 'rejected'
    uploaded_by: string
    uploaded_at: string
}

export type ModerationQueue = {
    id: string
    photo_id: string
    queued_at: string
    gemini_suggestion: string | null
    confidence_score: number | null
    processed: boolean
}

export type ModerationAction = {
    id: string
    photo_id: string
    moderator_id: string
    action: string
    reason: string | null
    actioned_at: string
}

export type JukeboxSettings = {
    event_id: string
    is_active: boolean
    vibe_filters: string[]
    spotify_playlist_id: string | null
    provider: 'spotify' | 'youtube'
    created_at: string
}

export type JukeboxQueue = {
    id: string
    event_id: string
    track_id: string
    spotify_track_id: string
    title: string
    artist: string
    album_art: string | null
    genre: string | null
    votes: number
    voters: any
    status: 'pending' | 'played'
    provider: 'spotify' | 'youtube'
    created_at: string
}

export type AdminConfig = {
    key: string
    value: string
    updated_at: string
}
