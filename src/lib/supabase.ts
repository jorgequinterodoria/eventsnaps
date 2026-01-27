import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL 
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY 

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          code: string
          created_at: string
          expires_at: string
          creator_id: string
          moderation_enabled: boolean
          status: 'active' | 'expired'
        }
        Insert: {
          id?: string
          code: string
          created_at?: string
          expires_at: string
          creator_id: string
          moderation_enabled?: boolean
          status?: 'active' | 'expired'
        }
        Update: {
          id?: string
          code?: string
          created_at?: string
          expires_at?: string
          creator_id?: string
          moderation_enabled?: boolean
          status?: 'active' | 'expired'
        }
      }
      photos: {
        Row: {
          id: string
          event_id: string
          storage_path: string
          caption: string | null
          status: 'pending' | 'approved' | 'rejected'
          uploaded_by: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          event_id: string
          storage_path: string
          caption?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          uploaded_by: string
          uploaded_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          storage_path?: string
          caption?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          uploaded_by?: string
          uploaded_at?: string
        }
      }
      moderation_queues: {
        Row: {
          id: string
          photo_id: string
          queued_at: string
          gemini_suggestion: string | null
          confidence_score: number | null
          processed: boolean
        }
        Insert: {
          id?: string
          photo_id: string
          queued_at?: string
          gemini_suggestion?: string | null
          confidence_score?: number | null
          processed?: boolean
        }
        Update: {
          id?: string
          photo_id?: string
          queued_at?: string
          gemini_suggestion?: string | null
          confidence_score?: number | null
          processed?: boolean
        }
      }
      moderation_actions: {
        Row: {
          id: string
          photo_id: string
          moderator_id: string
          action: string
          reason: string | null
          actioned_at: string
        }
        Insert: {
          id?: string
          photo_id: string
          moderator_id: string
          action: string
          reason?: string | null
          actioned_at?: string
        }
        Update: {
          id?: string
          photo_id?: string
          moderator_id?: string
          action?: string
          reason?: string | null
          actioned_at?: string
        }
      }
      jukebox_settings: {
        Row: {
          event_id: string
          is_active: boolean
          vibe_filters: string[]
          spotify_playlist_id: string | null
          provider: 'spotify' | 'youtube'
          created_at: string
        }
        Insert: {
          event_id: string
          is_active?: boolean
          vibe_filters?: string[]
          spotify_playlist_id?: string | null
          provider?: 'spotify' | 'youtube'
          created_at?: string
        }
        Update: {
          event_id?: string
          is_active?: boolean
          vibe_filters?: string[]
          spotify_playlist_id?: string | null
          provider?: 'spotify' | 'youtube'
          created_at?: string
        }
      }
      jukebox_queue: {
        Row: {
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
        Insert: {
          id?: string
          event_id: string
          track_id: string
          spotify_track_id?: string
          title: string
          artist: string
          album_art?: string | null
          genre?: string | null
          votes?: number
          voters?: any
          status?: 'pending' | 'played'
          provider?: 'spotify' | 'youtube'
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          track_id?: string
          spotify_track_id?: string
          title?: string
          artist?: string
          album_art?: string | null
          genre?: string | null
          votes?: number
          voters?: any
          status?: 'pending' | 'played'
          provider?: 'spotify' | 'youtube'
          created_at?: string
        }
      }
      admin_config: {
        Row: {
          key: string
          value: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Tables = Database['public']['Tables']
export type Event = Tables['events']['Row']
export type Photo = Tables['photos']['Row']
export type ModerationQueue = Tables['moderation_queues']['Row']
export type ModerationAction = Tables['moderation_actions']['Row']
export type JukeboxSettings = Tables['jukebox_settings']['Row']
export type JukeboxQueue = Tables['jukebox_queue']['Row']
export type AdminConfig = Tables['admin_config']['Row']