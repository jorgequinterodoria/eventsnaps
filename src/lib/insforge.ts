import { createClient } from '@insforge/sdk'

const insforgeUrl = import.meta.env.VITE_INSFORGE_URL
const insforgeAnonKey = import.meta.env.VITE_INSFORGE_ANON_KEY

export const insforge = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey
})

// ---- Type Definitions ----

export type PlanFeatures = {
    gallery: boolean
    playlist: boolean
    tv_mode: boolean
    white_label: boolean
    themes: boolean
    max_storage_gb: number
}

export type Plan = {
    id: string
    name: string
    features: PlanFeatures
    price: number
}

export type UserSubscription = {
    id: string
    user_id: string
    plan_id: string
    status: 'active' | 'trialing' | 'past_due' | 'canceled'
    external_subscription_id: string | null
    current_period_end: string | null
    created_at: string
    plans?: Plan   // joined relation
}

export interface LandingConfig {
  cover_url?: string
  headline?: string
  subheadline?: string
  show_gallery_button?: boolean
  show_jukebox_button?: boolean
}

export type Event = {
    id: string
    code: string
    title: string
    created_at: string
    expires_at: string
    creator_id: string
    moderation_enabled: boolean
    status: 'active' | 'expired'
    theme: string
    landing_config: LandingConfig
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

type ModerationQueue = {
    id: string
    photo_id: string
    queued_at: string
    gemini_suggestion: string | null
    confidence_score: number | null
    processed: boolean
}

type ModerationAction = {
    id: string
    photo_id: string
    moderator_id: string
    action: string
    reason: string | null
    actioned_at: string
}

type JukeboxSettings = {
    event_id: string
    is_active: boolean
    vibe_filters: string[]
    spotify_playlist_id: string | null
    provider: 'spotify' | 'youtube'
    created_at: string
}

export type JukeboxQueueItem = {
    id: string
    event_id: string
    track_id: string
    spotify_track_id: string
    title: string
    artist: string
    album_art: string | null
    genre: string | null
    votes: number
    voters: string[]
    status: 'pending' | 'played'
    provider: 'spotify' | 'youtube'
    created_at: string
}

type AdminConfig = {
    key: string
    value: string
    updated_at: string
}
