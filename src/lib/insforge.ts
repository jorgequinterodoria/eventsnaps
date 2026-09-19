import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

const auth = {
    signInWithPassword: (credentials: Parameters<typeof supabase.auth.signInWithPassword>[0]) =>
        supabase.auth.signInWithPassword(credentials),
    signUp: (credentials: Parameters<typeof supabase.auth.signUp>[0]) =>
        supabase.auth.signUp(credentials),
    signOut: () => supabase.auth.signOut(),
    getCurrentUser: () => supabase.auth.getUser(),
    signInWithOAuth: ({ provider, redirectTo }: { provider: 'google' | 'github'; redirectTo?: string }) =>
        supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
}

const channels = new Map<string, ReturnType<SupabaseClient['channel']>>()
const realtimeHandlers = new Map<string, Set<(payload: any) => void>>()

const realtime = {
    async connect() { },
    async subscribe(name: string) {
        if (channels.has(name)) return
        const channel = supabase.channel(name)
        channels.set(name, channel)
        await channel.subscribe()
        for (const [event, handlers] of realtimeHandlers) {
            channel.on('broadcast', { event }, ({ payload }) => handlers.forEach((handler) => handler(payload)))
        }
    },
    unsubscribe(name: string) {
        const channel = channels.get(name)
        if (channel) supabase.removeChannel(channel)
        channels.delete(name)
    },
    on(event: string, handler: (payload: any) => void) {
        const handlers = realtimeHandlers.get(event) || new Set()
        handlers.add(handler)
        realtimeHandlers.set(event, handlers)
        for (const channel of channels.values()) {
            channel.on('broadcast', { event }, ({ payload }) => handler(payload))
        }
    },
    off(event: string, handler: (payload: any) => void) {
        realtimeHandlers.get(event)?.delete(handler)
    },
    async publish(channelName: string, event: string, payload: any) {
        const channel = channels.get(channelName) || supabase.channel(channelName)
        if (!channels.has(channelName)) {
            channels.set(channelName, channel)
            await channel.subscribe()
        }
        await channel.send({ type: 'broadcast', event, payload })
    }
}

export const insforge = { auth, database: supabase, storage: supabase.storage, functions: supabase.functions, realtime }

// ---- Type Definitions ----

export type PlanFeatures = {
    gallery: boolean
    playlist: boolean
    tv_mode: boolean
    white_label: boolean
    themes: boolean
    enhancements: boolean
    reel: boolean
    album: boolean
    challenges: boolean
    reactions: boolean
    live_wall: boolean
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
    archived: boolean
    archive_expires_at: string | null
}

export type Photo = {
    id: string
    event_id: string
    storage_path: string
    storage_url: string | null
    enhanced_url: string | null
    ai_metadata: Record<string, any> | null
    caption: string | null
    status: 'pending' | 'approved' | 'rejected'
    uploaded_by: string
    uploaded_at: string
    challenge_id?: string | null
}

export type Challenge = {
    id: string
    event_id: string
    title: string
    description: string | null
    prize: string | null
    is_active: boolean
    created_at: string
}

export type PhotoReaction = {
    id: string
    photo_id: string
    session_id: string
    emoji: string
    created_at: string
}

export type EventRecap = {
    id: string
    event_id: string
    status: 'pending' | 'generating' | 'ready' | 'error'
    video_url: string | null
    music_track: string | null
    created_at: string
}

export type LiveMessage = {
    id: string
    event_id: string
    author_name: string
    message: string
    is_approved: boolean
    created_at: string
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
