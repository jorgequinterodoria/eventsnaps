export interface UserProfile {
    id: string
    email: string
    role: string
    plan_id: string
    status: string
    created_at: string
    full_name?: string
    custom_logo_url?: string
    instagram_username?: string
}

interface JukeboxSettings {
    id: string
    event_id: string
    is_active: boolean
    provider: 'spotify' | 'youtube'
    created_at: string
}

export interface AdminEvent {
    id: string
    code: string
    created_at: string
    creator_id: string
    title: string
    expires_at: string
    jukebox_settings?: JukeboxSettings | null
}

interface ModerationPhoto {
    id: string
    status: string
    storage_path: string
    caption?: string
    event_id: string
    events: {
        id: string
        code: string
        creator_id: string
    }
}

export interface ModerationQueueEntry {
    id: string
    photo_id: string
    queued_at: string
    gemini_suggestion: 'approve' | 'reject' | null
    confidence_score: number | null
    processed: boolean
    error_message: string | null
    photos: ModerationPhoto
}

export interface OrganizedModerationLog {
    event: ModerationPhoto['events']
    rows: ModerationQueueEntry[]
}

export interface AdminConfigItem {
    key: string
    value: string
    created_at?: string
    updated_at?: string
}
