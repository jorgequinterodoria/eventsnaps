import { create } from 'zustand'
import type { Event, Photo } from './supabase'

interface AppState {
  currentEvent: Event | null
  photos: Photo[]
  isLoading: boolean
  error: string | null
  
  setCurrentEvent: (event: Event | null) => void
  setPhotos: (photos: Photo[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addPhoto: (photo: Photo) => void
}

export const useStore = create<AppState>((set) => ({
  currentEvent: null,
  photos: [],
  isLoading: false,
  error: null,
  
  setCurrentEvent: (event) => set({ currentEvent: event }),
  setPhotos: (photos) => set({ photos }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  addPhoto: (photo) => set((state) => ({ photos: [photo, ...state.photos] })),
}))