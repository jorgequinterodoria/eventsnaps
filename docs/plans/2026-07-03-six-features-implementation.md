# Six Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 6 new features for EventSnaps: AI Photo Enhancement, Reel/Aftermovie, Permanent Album, Photo Challenges, Reactions, and Live Wall.

**Architecture:** Features are implemented in dependency order. DB schema first, then edge functions, then hooks, then UI components, then pages. Each feature is self-contained but shares the existing InsForge infrastructure (realtime, storage, Gemini AI).

**Tech Stack:** React, TypeScript, Tailwind CSS, InsForge SDK, Zustand, i18next, Gemini 2.0 Flash (AI), JSZip (archive), Canvas API (reel generation)

**Plan Gating:**
- Features 1-3 (AI Enhancement, Reel/Aftermovie, Album): **Pro only**
- Features 4-6 (Challenges, Reactions, Live Wall): **Both plans**

---

## Phase 0: Database Schema (All Features)

### Task 0.1: Create new tables and columns

**Files:**
- Modify: `database_schema.sql`
- Create: SQL migration via `npx @insforge/cli db query`

**Step 1: Add columns to photos table**

```sql
ALTER TABLE photos ADD COLUMN IF NOT EXISTS enhanced_url TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}';
ALTER TABLE photos ADD COLUMN IF NOT EXISTS challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL;
```

**Step 2: Create challenges table**

```sql
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  prize TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Step 3: Create photo_reactions table**

```sql
CREATE TABLE IF NOT EXISTS photo_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(photo_id, session_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_photo_reactions_photo_id ON photo_reactions(photo_id);
```

**Step 4: Create event_recaps table**

```sql
CREATE TABLE IF NOT EXISTS event_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  video_url TEXT,
  music_track TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Step 5: Create live_messages table**

```sql
CREATE TABLE IF NOT EXISTS live_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  message TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_messages_event_id ON live_messages(event_id);
```

**Step 6: Add archive columns to events**

```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS archive_expires_at TIMESTAMPTZ;
```

**Step 7: Add features to plans**

```sql
UPDATE plans SET features = jsonb_set(features, '{enhancements}', 'true') WHERE id = 'pro';
UPDATE plans SET features = jsonb_set(features, '{reel}', 'true') WHERE id = 'pro';
UPDATE plans SET features = jsonb_set(features, '{album}', 'true') WHERE id = 'pro';
UPDATE plans SET features = jsonb_set(features, '{challenges}', 'true') WHERE id = 'pro';
UPDATE plans SET features = jsonb_set(features, '{challenges}', 'true') WHERE id = 'basic';
UPDATE plans SET features = jsonb_set(features, '{reactions}', 'true') WHERE id = 'pro';
UPDATE plans SET features = jsonb_set(features, '{reactions}', 'true') WHERE id = 'basic';
UPDATE plans SET features = jsonb_set(features, '{live_wall}', 'true') WHERE id = 'pro';
UPDATE plans SET features = jsonb_set(features, '{live_wall}', 'true') WHERE id = 'basic';
```

**Step 8: Enable RLS**

```sql
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_recaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_messages ENABLE ROW LEVEL SECURITY;

-- Public access for all (matching existing pattern)
CREATE POLICY "Public access" ON challenges FOR ALL USING (true);
CREATE POLICY "Public access" ON photo_reactions FOR ALL USING (true);
CREATE POLICY "Public access" ON event_recaps FOR ALL USING (true);
CREATE POLICY "Public access" ON live_messages FOR ALL USING (true);
```

**Step 9: Run all SQL**

Run each statement via `npx @insforge/cli db query "..."`

**Step 10: Update database_schema.sql**

Add all new tables and columns to the schema file for documentation.

---

## Phase 1: Feature 1 - AI Photo Enhancement & Filters

### Task 1.1: Update TypeScript types

**Files:**
- Modify: `src/lib/insforge.ts`

**Step 1: Add enhanced_url and ai_metadata to Photo type**

```typescript
export type Photo = {
    id: string
    event_id: string
    storage_path: string
    storage_url: string | null
    enhanced_url: string | null
    ai_metadata: {
      filter_applied?: string
      enhancement_version?: number
      original_colors?: { brightness: number; contrast: number; saturation: number }
      sticker_applied?: boolean
      sticker_url?: string
    } | null
    caption: string | null
    status: 'pending' | 'approved' | 'rejected'
    uploaded_by: string
    uploaded_at: string
    challenge_id?: string | null
}
```

**Step 2: Add PlanFeatures enhancements field**

```typescript
export type PlanFeatures = {
    gallery: boolean
    playlist: boolean
    tv_mode: boolean
    white_label: boolean
    themes: boolean
    enhancements: boolean  // NEW
    reel: boolean          // NEW
    album: boolean         // NEW
    challenges: boolean    // NEW
    reactions: boolean     // NEW
    live_wall: boolean     // NEW
    max_storage_gb: number
}
```

### Task 1.2: Create enhance-photo edge function

**Files:**
- Create: `.insforge/functions/enhance-photo/index.js`

**Step 1: Create the edge function**

```javascript
// .insforge/functions/enhance-photo/index.js
module.exports = async function handler(request) {
  const { storagePath, enhancementType, filterPreset, eventTheme } = await request.json()

  // 1. Get Gemini API key
  const insforgeUrl = Deno.env.get('INSFORGE_URL') || request.headers.get('x-insforge-url')
  const anonKey = Deno.env.get('INSFORGE_ANON_KEY') || request.headers.get('x-insforge-anon-key')

  // 2. Download photo from storage
  const photoUrl = `${insforgeUrl}/api/storage/buckets/photos/objects/${encodeURIComponent(storagePath)}`
  const photoResponse = await fetch(photoUrl, {
    headers: { 'Authorization': `Bearer ${anonKey}` }
  })
  const photoBlob = await photoResponse.blob()
  const base64 = await blobToBase64(photoBlob)

  // 3. Call Gemini for enhancement based on type
  const geminiKey = await getGeminiKey(insforgeUrl, anonKey)

  let prompt = ''
  switch (enhancementType) {
    case 'enhance':
      prompt = 'Improve this photo: optimize brightness, contrast, and color balance. Return the enhanced image.'
      break
    case 'remove_bg':
      prompt = 'Remove the background from this photo, keeping only the main subjects. Return the image with transparent background.'
      break
    case 'filter':
      prompt = getFilterPrompt(filterPreset, eventTheme)
      break
    case 'sticker':
      prompt = `Create a decorative frame/sticker overlay for this photo with ${eventTheme || 'default'} event branding. Return the framed image.`
      break
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: base64 } }
          ]
        }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
      })
    }
  )

  const result = await geminiResponse.json()
  // 4. Extract enhanced image from response
  // 5. Upload enhanced image to storage
  // 6. Return { enhancedUrl, metadata }

  return { enhancedUrl, metadata: { filter_applied: filterPreset, enhancement_version: 1 } }
}

function getFilterPrompt(preset, theme) {
  const filters = {
    'vintage': 'Apply a vintage film aesthetic: warm tones, slight grain, faded blacks, light leak effects',
    'neon': 'Apply neon party aesthetic: vibrant colors, glow effects, dark background with neon highlights',
    'black_white': 'Convert to artistic black and white with high contrast',
    'warm': 'Apply warm color grading: golden tones, soft highlights, warm shadows',
    'cool': 'Apply cool color grading: blue tones, crisp highlights, cool shadows',
    'dramatic': 'Apply dramatic cinematic look: high contrast, teal and orange color grading, vignette'
  }
  return `${filters[preset] || filters.vintage}. Return the filtered image.`
}

async function getGeminiKey(url, key) {
  const { data } = await fetch(`${url}/api/rest/v1/admin_config?select=value&key=eq.gemini_api_key`, {
    headers: { 'Authorization': `Bearer ${key}` }
  }).then(r => r.json())
  return data?.[0]?.value || Deno.env.get('GEMINI_API_KEY')
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer()
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}
```

### Task 1.3: Create usePhotoEnhancement hook

**Files:**
- Create: `src/hooks/usePhotoEnhancement.ts`

**Step 1: Create the hook**

```typescript
import { useState } from 'react'
import { insforge } from '../lib/insforge'
import { useAlert } from '../contexts/AlertContext'

export type EnhancementType = 'enhance' | 'remove_bg' | 'filter' | 'sticker'
export type FilterPreset = 'vintage' | 'neon' | 'black_white' | 'warm' | 'cool' | 'dramatic'

export function usePhotoEnhancement() {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const { showAlert } = useAlert()

  const enhancePhoto = async (
    photoId: string,
    storagePath: string,
    type: EnhancementType,
    filterPreset?: FilterPreset,
    eventTheme?: string
  ) => {
    setIsEnhancing(true)
    try {
      const { data, error } = await insforge.functions.invoke('enhance-photo', {
        body: {
          storagePath,
          enhancementType: type,
          filterPreset: filterPreset || 'vintage',
          eventTheme
        }
      })

      if (error) throw error

      // Update photo record with enhanced URL and metadata
      await insforge.database
        .from('photos')
        .update({
          enhanced_url: data.enhancedUrl,
          ai_metadata: {
            ...data.metadata,
            filter_applied: filterPreset,
            enhancement_version: 1
          }
        })
        .eq('id', photoId)

      return data
    } catch (err) {
      showAlert('Error enhancing photo', 'Error')
      throw err
    } finally {
      setIsEnhancing(false)
    }
  }

  return { enhancePhoto, isEnhancing }
}
```

### Task 1.4: Create PhotoEnhancer component

**Files:**
- Create: `src/components/event/PhotoEnhancer.tsx`

**Step 1: Create the component**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Palette, Sticker, Wand2, X } from 'lucide-react'
import { usePhotoEnhancement, type EnhancementType, type FilterPreset } from '../../hooks/usePhotoEnhancement'
import { cn } from '../../lib/utils'

interface PhotoEnhancerProps {
  photoId: string
  storagePath: string
  currentUrl: string
  eventTheme?: string
  onEnhanced: (enhancedUrl: string) => void
  onClose: () => void
}

const FILTERS: { id: FilterPreset; label: string; icon: string }[] = [
  { id: 'vintage', label: 'Vintage', icon: '🎬' },
  { id: 'neon', label: 'Neón', icon: '💎' },
  { id: 'black_white', label: 'B&N', icon: '⚫' },
  { id: 'warm', label: 'Cálido', icon: '🌅' },
  { id: 'cool', label: 'Frío', icon: '❄️' },
  { id: 'dramatic', label: 'Dramático', icon: '🎭' },
]

export default function PhotoEnhancer({ photoId, storagePath, currentUrl, eventTheme, onEnhanced, onClose }: PhotoEnhancerProps) {
  const { t } = useTranslation()
  const { enhancePhoto, isEnhancing } = usePhotoEnhancement()
  const [previewUrl, setPreviewUrl] = useState(currentUrl)

  const handleEnhance = async (type: EnhancementType, filter?: FilterPreset) => {
    try {
      const result = await enhancePhoto(photoId, storagePath, type, filter, eventTheme)
      setPreviewUrl(result.enhancedUrl)
      onEnhanced(result.enhancedUrl)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('enhance.title', 'Mejorar Foto con IA')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <img src={previewUrl} alt="" className="w-full h-64 object-cover rounded-lg" />
          {isEnhancing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <Wand2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p>{t('enhance.processing', 'Procesando con IA...')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => handleEnhance('enhance')}
            disabled={isEnhancing}
            className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50"
          >
            <Sparkles className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">{t('enhance.auto', 'Auto-mejora')}</span>
          </button>

          <button
            onClick={() => handleEnhance('remove_bg')}
            disabled={isEnhancing}
            className="flex items-center justify-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50"
          >
            <Palette className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium">{t('enhance.removeBg', 'Quitar fondo')}</span>
          </button>

          <button
            onClick={() => handleEnhance('sticker', undefined)}
            disabled={isEnhancing}
            className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-50"
          >
            <Sticker className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">{t('enhance.sticker', 'Sticker/Marco')}</span>
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('enhance.filters', 'Filtros Temáticos')}</p>
          <div className="grid grid-cols-3 gap-2">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => handleEnhance('filter', f.id)}
                disabled={isEnhancing}
                className="flex flex-col items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <span className="text-xl mb-1">{f.icon}</span>
                <span className="text-xs">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Task 1.5: Integrate into PhotoCard

**Files:**
- Modify: `src/components/event/PhotoCard.tsx`

**Step 1: Add enhance button and modal**

Add a `Sparkles` icon button that opens `PhotoEnhancer` modal. When enhanced, update the displayed URL to `photo.enhanced_url || photo.storage_url`.

### Task 1.6: Add translations

**Files:**
- Modify: `src/locales/es.json`, `en.json`, `pt.json`, `fr.json`

Add keys:
```json
"enhance": {
  "title": "Mejorar Foto con IA",
  "auto": "Auto-mejora",
  "removeBg": "Quitar fondo",
  "sticker": "Sticker/Marco",
  "filters": "Filtros Temáticos",
  "processing": "Procesando con IA..."
}
```

### Task 1.7: Build and verify

Run: `npm run build`

---

## Phase 2: Feature 2 - Reel/Aftermovie Automático

### Task 2.1: Create event-recaps edge function

**Files:**
- Create: `.insforge/functions/generate-reel/index.js`

**Step 1: Create the edge function**

This function uses Canvas API (server-side) to stitch photos into a video slideshow with transitions.

```javascript
// .insforge/functions/generate-reel/index.js
module.exports = async function handler(request) {
  const { eventId } = await request.json()

  // 1. Fetch all approved photos for the event
  // 2. Create recap record with status='generating'
  // 3. Download all photos
  // 4. Use Canvas API to create video frames with transitions
  // 5. Use Web Audio API to mix with music track
  // 6. Encode to MP4 (using ffmpeg.wasm or similar)
  // 7. Upload to storage
  // 8. Update recap record with status='ready' and video_url

  return { recapId, videoUrl, status: 'ready' }
}
```

### Task 2.2: Create useEventReel hook

**Files:**
- Create: `src/hooks/useEventReel.ts`

**Step 1: Create the hook**

```typescript
import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'

export interface EventRecap {
  id: string
  event_id: string
  status: 'pending' | 'generating' | 'ready' | 'error'
  video_url: string | null
  music_track: string | null
  created_at: string
}

export function useEventReel(eventId?: string) {
  const [recap, setRecap] = useState<EventRecap | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchRecap = async () => {
    if (!eventId) return
    const { data } = await insforge.database
      .from('event_recaps')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setRecap(data)
  }

  const generateReel = async (musicTrack?: string) => {
    if (!eventId) return
    setIsGenerating(true)
    try {
      const { data, error } = await insforge.functions.invoke('generate-reel', {
        body: { eventId, musicTrack }
      })
      if (error) throw error
      setRecap(data)
      return data
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    fetchRecap()
  }, [eventId])

  return { recap, isGenerating, generateReel, refetch: fetchRecap }
}
```

### Task 2.3: Create ReelPreview component

**Files:**
- Create: `src/components/event/ReelPreview.tsx`

**Step 1: Create the component**

```tsx
import { useTranslation } from 'react-i18next'
import { Film, Download, Share2, Loader2 } from 'lucide-react'
import { useEventReel } from '../../hooks/useEventReel'

interface ReelPreviewProps {
  eventId: string
  isCreator: boolean
}

export default function ReelPreview({ eventId, isCreator }: ReelPreviewProps) {
  const { t } = useTranslation()
  const { recap, isGenerating, generateReel } = useEventReel(eventId)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <Film className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {t('reel.title', 'Reel / Aftermovie')}
        </h3>
      </div>

      {recap?.status === 'ready' && recap.video_url ? (
        <div>
          <video
            src={recap.video_url}
            controls
            className="w-full rounded-lg mb-4"
          />
          <div className="flex gap-3">
            <a
              href={recap.video_url}
              download
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              {t('reel.download', 'Descargar')}
            </a>
            <button
              onClick={() => navigator.share?.({ title: 'EventSnaps Reel', url: recap.video_url! })}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Share2 className="h-4 w-4" />
              {t('reel.share', 'Compartir')}
            </button>
          </div>
        </div>
      ) : isGenerating ? (
        <div className="text-center py-8">
          <Loader2 className="h-12 w-12 mx-auto mb-3 text-purple-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">{t('reel.generating', 'Generando reel...')}</p>
        </div>
      ) : isCreator ? (
        <div className="text-center py-8">
          <Film className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('reel.noRecap', 'No hay reel disponible aún')}</p>
          <button
            onClick={() => generateReel()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {t('reel.generate', 'Generar Reel')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
```

### Task 2.4: Auto-generate on event expiry

**Files:**
- Modify: `src/hooks/useEventRealtime.ts` or create new `useEventExpiry.ts`

**Step 1: Add expiry detection**

When event expires (`isEventExpired` returns true), check if recap exists. If not and event is pro, auto-trigger `generateReel()`.

### Task 2.5: Add translations

Add keys:
```json
"reel": {
  "title": "Reel / Aftermovie",
  "download": "Descargar",
  "share": "Compartir",
  "generating": "Generando reel...",
  "noRecap": "No hay reel disponible aún",
  "generate": "Generar Reel"
}
```

### Task 2.6: Build and verify

Run: `npm run build`

---

## Phase 3: Feature 3 - Álbum Permanente / Rescate de Fotos

### Task 3.1: Create useAlbumArchive hook

**Files:**
- Create: `src/hooks/useAlbumArchive.ts`

**Step 1: Create the hook**

```typescript
import { useState } from 'react'
import { insforge } from '../lib/insforge'
import { useAlert } from '../contexts/AlertContext'

export function useAlbumArchive(eventId?: string) {
  const [isArchiving, setIsArchiving] = useState(false)
  const { showAlert } = useAlert()

  const archiveEvent = async () => {
    if (!eventId) return
    setIsArchiving(true)
    try {
      const { error } = await insforge.database
        .from('events')
        .update({
          archived: true,
          archive_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .eq('id', eventId)
      if (error) throw error
      showAlert('Álbum guardado permanentemente por 30 días', 'Éxito')
    } catch {
      showAlert('Error al guardar álbum', 'Error')
    } finally {
      setIsArchiving(false)
    }
  }

  const exportToGooglePhotos = async () => {
    // Placeholder for Google Photos API integration
    showAlert('Exportación a Google Photos próximamente', 'Próximamente')
  }

  const exportToDrive = async () => {
    // Placeholder for Google Drive API integration
    showAlert('Exportación a Google Drive próximamente', 'Próximamente')
  }

  return { archiveEvent, exportToGooglePhotos, exportToDrive, isArchiving }
}
```

### Task 3.2: Create ArchivePrompt component

**Files:**
- Create: `src/components/event/ArchivePrompt.tsx`

**Step 1: Create the component**

```tsx
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, Clock, Download, Cloud, AlertTriangle } from 'lucide-react'
import { useAlbumArchive } from '../../hooks/useAlbumArchive'
import { isEventExpired } from '../../lib/utils'

interface ArchivePromptProps {
  eventId: string
  expiresAt: string
  isCreator: boolean
  archived: boolean
}

export default function ArchivePrompt({ eventId, expiresAt, isCreator, archived }: ArchivePromptProps) {
  const { t } = useTranslation()
  const { archiveEvent, exportToGooglePhotos, exportToDrive, isArchiving } = useAlbumArchive(eventId)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (!archived && isCreator) {
      const timeLeft = new Date(expiresAt).getTime() - Date.now()
      if (timeLeft < 2 * 60 * 60 * 1000 && timeLeft > 0) { // Less than 2 hours
        setShowPrompt(true)
      }
    }
  }, [expiresAt, isCreator, archived])

  if (!showPrompt && !archived) return null

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
      {archived ? (
        <div className="text-center">
          <Archive className="h-12 w-12 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">{t('archive.saved', 'Álbum Guardado')}</h3>
          <p className="text-white/80">{t('archive.savedDesc', 'Tus fotos están seguras por 30 días más')}</p>
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={exportToGooglePhotos} className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30">
              <Cloud className="h-4 w-4" /> Google Photos
            </button>
            <button onClick={exportToDrive} className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30">
              <Download className="h-4 w-4" /> Google Drive
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3" />
          <h3 className="text-xl font-bold mb-2">{t('archive.expiring', '¿Guardar tus fotos?')}</h3>
          <p className="text-white/80 mb-4">{t('archive.expiringDesc', 'Tu evento está por expirar. Guarda el álbum permanentemente por 30 días.')}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={archiveEvent}
              disabled={isArchiving}
              className="flex items-center gap-2 px-6 py-3 bg-white text-orange-600 rounded-lg font-bold hover:bg-white/90 disabled:opacity-50"
            >
              <Archive className="h-5 w-5" />
              {isArchiving ? t('archive.saving', 'Guardando...') : t('archive.saveNow', 'Guardar Álbum')}
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="px-4 py-3 bg-white/20 rounded-lg hover:bg-white/30"
            >
              {t('archive.later', 'Ahora no')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Task 3.3: Integrate into EventPage

**Files:**
- Modify: `src/pages/EventPage.tsx`

**Step 1: Add ArchivePrompt**

Add `ArchivePrompt` component below the event header, passing `event.id`, `event.expires_at`, creator status, and `event.archived`.

### Task 3.4: Add translations

Add keys:
```json
"archive": {
  "saved": "Álbum Guardado",
  "savedDesc": "Tus fotos están seguras por 30 días más",
  "expiring": "¿Guardar tus fotos?",
  "expiringDesc": "Tu evento está por expirar. Guarda el álbum permanentemente por 30 días.",
  "saveNow": "Guardar Álbum",
  "saving": "Guardando...",
  "later": "Ahora no"
}
```

### Task 3.5: Build and verify

Run: `npm run build`

---

## Phase 4: Feature 4 - Photo Challenges (Gamificación)

### Task 4.1: Create challenges CRUD functions

**Files:**
- Modify: `src/lib/database.ts`

**Step 1: Add challenge functions**

```typescript
export async function createChallenge(eventId: string, title: string, description?: string, prize?: string) {
  const { data, error } = await insforge.database
    .from('challenges')
    .insert({ event_id: eventId, title, description, prize })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getEventChallenges(eventId: string) {
  const { data, error } = await insforge.database
    .from('challenges')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getChallengeLeaderboard(challengeId: string) {
  const { data, error } = await insforge.database
    .from('photos')
    .select('id, storage_url, uploaded_by, uploaded_at, photo_reactions(count)')
    .eq('challenge_id', challengeId)
    .eq('status', 'approved')
  if (error) throw error
  return data || []
}
```

### Task 4.2: Create useChallenges hook

**Files:**
- Create: `src/hooks/useChallenges.ts`

**Step 1: Create the hook**

```typescript
import { useState, useEffect } from 'react'
import { insforge } from '../lib/insforge'
import { getEventChallenges, createChallenge, getChallengeLeaderboard } from '../lib/database'
import { useAlert } from '../contexts/AlertContext'

export interface Challenge {
  id: string
  event_id: string
  title: string
  description: string | null
  prize: string | null
  is_active: boolean
  created_at: string
  photo_count?: number
}

export function useChallenges(eventId?: string) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const { showAlert } = useAlert()

  const fetchChallenges = async () => {
    if (!eventId) return
    const data = await getEventChallenges(eventId)
    setChallenges(data)
  }

  const addChallenge = async (title: string, description?: string, prize?: string) => {
    if (!eventId) return
    setIsCreating(true)
    try {
      const challenge = await createChallenge(eventId, title, description, prize)
      setChallenges(prev => [...prev, challenge])
      showAlert('Reto creado', 'Éxito')
      return challenge
    } catch {
      showAlert('Error creando reto', 'Error')
    } finally {
      setIsCreating(false)
    }
  }

  const loadLeaderboard = async (challengeId: string) => {
    const data = await getChallengeLeaderboard(challengeId)
    setLeaderboard(data)
  }

  useEffect(() => {
    fetchChallenges()
  }, [eventId])

  return { challenges, activeChallenge, setActiveChallenge, leaderboard, loadLeaderboard, addChallenge, isCreating, refetch: fetchChallenges }
}
```

### Task 4.3: Create ChallengeCard component

**Files:**
- Create: `src/components/event/ChallengeCard.tsx`

**Step 1: Create the component**

```tsx
import { useTranslation } from 'react-i18next'
import { Trophy, Award, Users } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Challenge } from '../../hooks/useChallenges'

interface ChallengeCardProps {
  challenge: Challenge
  isActive: boolean
  onSelect: () => void
}

export default function ChallengeCard({ challenge, isActive, onSelect }: ChallengeCardProps) {
  const { t } = useTranslation()

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all",
        isActive
          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-yellow-300"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 dark:text-gray-100">{challenge.title}</h4>
          {challenge.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{challenge.description}</p>
          )}
        </div>
        {isActive && <Trophy className="h-5 w-5 text-yellow-500" />}
      </div>
      {challenge.prize && (
        <div className="flex items-center gap-2 mt-3 text-sm text-amber-600 dark:text-amber-400">
          <Award className="h-4 w-4" />
          <span>{challenge.prize}</span>
        </div>
      )}
    </button>
  )
}
```

### Task 4.4: Create ChallengeCreator component

**Files:**
- Create: `src/components/event/ChallengeCreator.tsx`

**Step 1: Create the component**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { useChallenges } from '../../hooks/useChallenges'

interface ChallengeCreatorProps {
  eventId: string
  onCreated: () => void
  onClose: () => void
}

export default function ChallengeCreator({ eventId, onCreated, onClose }: ChallengeCreatorProps) {
  const { t } = useTranslation()
  const { addChallenge, isCreating } = useChallenges(eventId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prize, setPrize] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await addChallenge(title, description, prize)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('challenge.create', 'Crear Reto')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('challenge.title', 'Título')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Foto con los novios"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('challenge.description', 'Descripción')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('challenge.prize', 'Premio')}</label>
            <input
              type="text"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              placeholder="Ej: Botella de champagne"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating || !title.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            {isCreating ? t('challenge.creating', 'Creando...') : t('challenge.createBtn', 'Crear Reto')}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### Task 4.5: Create ChallengeLeaderboard component

**Files:**
- Create: `src/components/event/ChallengeLeaderboard.tsx`

**Step 1: Create the component**

```tsx
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy, Medal, Crown } from 'lucide-react'
import { useChallenges } from '../../hooks/useChallenges'

interface ChallengeLeaderboardProps {
  challengeId: string
}

export default function ChallengeLeaderboard({ challengeId }: ChallengeLeaderboardProps) {
  const { t } = useTranslation()
  const { leaderboard, loadLeaderboard } = useChallenges()

  useEffect(() => {
    loadLeaderboard(challengeId)
  }, [challengeId])

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-6 w-6 text-yellow-500" />
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />
    return <span className="text-gray-500 w-6 text-center">{index + 1}</span>
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        {t('challenge.leaderboard', 'Leaderboard')}
      </h4>
      <div className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div key={entry.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {getRankIcon(index)}
            <img
              src={entry.storage_url}
              alt=""
              className="w-12 h-12 object-cover rounded-lg"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {entry.uploaded_by || 'Anónimo'}
              </p>
              <p className="text-xs text-gray-500">
                {entry.photo_reactions?.[0]?.count || 0} {t('challenge.votes', 'votos')}
              </p>
            </div>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <p className="text-center text-gray-500 py-4">{t('challenge.noEntries', 'Aún no hay participantes')}</p>
        )}
      </div>
    </div>
  )
}
```

### Task 4.6: Integrate challenges into EventPage

**Files:**
- Modify: `src/pages/EventPage.tsx`

**Step 1: Add challenges section**

Add a challenges section between photos and jukebox. Show active challenge selector, leaderboard, and "Create Challenge" button for creators.

### Task 4.7: Integrate challenges into upload flow

**Files:**
- Modify: `src/hooks/useImageUpload.ts`

**Step 1: Add challenge_id to upload**

When a challenge is active, attach `challenge_id` to the photo upload.

### Task 4.8: Integrate challenges into TV Mode

**Files:**
- Modify: `src/components/TVMode.tsx`

**Step 1: Add leaderboard display**

Show current challenge leaderboard on the TV mode overlay.

### Task 4.9: Add translations

Add keys:
```json
"challenge": {
  "create": "Crear Reto",
  "title": "Título",
  "description": "Descripción",
  "prize": "Premio",
  "creating": "Creando...",
  "createBtn": "Crear Reto",
  "leaderboard": "Leaderboard",
  "votes": "votos",
  "noEntries": "Aún no hay participantes"
}
```

### Task 4.10: Build and verify

Run: `npm run build`

---

## Phase 5: Feature 5 - Reacciones y Comentarios en Vivo

### Task 5.1: Create reactions CRUD functions

**Files:**
- Modify: `src/lib/database.ts`

**Step 1: Add reaction functions**

```typescript
export async function addReaction(photoId: string, sessionId: string, emoji: string) {
  const { data, error } = await insforge.database
    .from('photo_reactions')
    .upsert({ photo_id: photoId, session_id: sessionId, emoji }, { onConflict: 'photo_id,session_id,emoji' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeReaction(photoId: string, sessionId: string, emoji: string) {
  const { error } = await insforge.database
    .from('photo_reactions')
    .delete()
    .eq('photo_id', photoId)
    .eq('session_id', sessionId)
    .eq('emoji', emoji)
  if (error) throw error
}

export async function getPhotoReactions(photoId: string) {
  const { data, error } = await insforge.database
    .from('photo_reactions')
    .select('emoji, count(*)')
    .eq('photo_id', photoId)
    .group('emoji')
  if (error) throw error
  return data || []
}
```

### Task 5.2: Create useReactions hook

**Files:**
- Create: `src/hooks/useReactions.ts`

**Step 1: Create the hook**

```typescript
import { useState, useCallback } from 'react'
import { addReaction, removeReaction, getPhotoReactions } from '../lib/database'
import { useInsforgeRealtime } from './useInsforgeRealtime'

export interface Reaction {
  emoji: string
  count: number
  userReacted?: boolean
}

export function useReactions(eventId?: string) {
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map())
  const { on } = useInsforgeRealtime(eventId)
  const sessionId = getOrCreateSessionId()

  const fetchReactions = useCallback(async (photoId: string) => {
    const data = await getPhotoReactions(photoId)
    const reactionMap = data.map((r: any) => ({
      emoji: r.emoji,
      count: parseInt(r.count),
      userReacted: false // TODO: check against sessionId
    }))
    setReactions(prev => new Map(prev).set(photoId, reactionMap))
  }, [])

  const toggleReaction = useCallback(async (photoId: string, emoji: string) => {
    const currentReactions = reactions.get(photoId) || []
    const existing = currentReactions.find(r => r.emoji === emoji)

    if (existing?.userReacted) {
      await removeReaction(photoId, sessionId, emoji)
    } else {
      await addReaction(photoId, sessionId, emoji)
    }

    // Refresh reactions
    await fetchReactions(photoId)
  }, [reactions, sessionId, fetchReactions])

  // Subscribe to realtime reaction updates
  useState(() => {
    on('INSERT_photo_reaction', async (payload: any) => {
      const photoId = payload.new?.photo_id
      if (photoId) await fetchReactions(photoId)
    })
    on('DELETE_photo_reaction', async (payload: any) => {
      const photoId = payload.old?.photo_id
      if (photoId) await fetchReactions(photoId)
    })
  })

  return { reactions, toggleReaction, fetchReactions }
}

function getOrCreateSessionId(): string {
  let id = localStorage.getItem('eventsnaps_session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('eventsnaps_session_id', id)
  }
  return id
}
```

### Task 5.3: Create ReactionBar component

**Files:**
- Create: `src/components/event/ReactionBar.tsx`

**Step 1: Create the component**

```tsx
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'
import { useReactions } from '../../hooks/useReactions'

const EMOJI_OPTIONS = ['❤️', '🔥', '😂', '😮', '👏', '🎉']

interface ReactionBarProps {
  photoId: string
  eventId: string
}

export default function ReactionBar({ photoId, eventId }: ReactionBarProps) {
  const { t } = useTranslation()
  const { reactions, toggleReaction, fetchReactions } = useReactions(eventId)

  useEffect(() => {
    fetchReactions(photoId)
  }, [photoId])

  const photoReactions = reactions.get(photoId) || []

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EMOJI_OPTIONS.map(emoji => {
        const reaction = photoReactions.find(r => r.emoji === emoji)
        return (
          <button
            key={emoji}
            onClick={() => toggleReaction(photoId, emoji)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-all",
              reaction?.userReacted
                ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300"
                : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            )}
          >
            <span>{emoji}</span>
            {reaction && reaction.count > 0 && (
              <span className="text-xs text-gray-600 dark:text-gray-400">{reaction.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

### Task 5.4: Integrate into PhotoCard

**Files:**
- Modify: `src/components/event/PhotoCard.tsx`

**Step 1: Add ReactionBar below photo**

Add `ReactionBar` component below each photo in the gallery view.

### Task 5.5: Integrate into TV Mode

**Files:**
- Modify: `src/components/TVMode.tsx`

**Step 1: Add reaction overlay**

Show reaction counts on the current photo in TV mode with animated emoji pops.

### Task 5.6: Add translations

Add keys:
```json
"reactions": {
  "title": "Reacciones",
  "toggle": "Reaccionar"
}
```

### Task 5.7: Build and verify

Run: `npm run build`

---

## Phase 6: Feature 6 - Muro en Vivo / Live Wall

### Task 6.1: Create live messages CRUD functions

**Files:**
- Modify: `src/lib/database.ts`

**Step 1: Add message functions**

```typescript
export async function sendLiveMessage(eventId: string, authorName: string, message: string) {
  const { data, error } = await insforge.database
    .from('live_messages')
    .insert({ event_id: eventId, author_name: authorName, message })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getLiveMessages(eventId: string) {
  const { data, error } = await insforge.database
    .from('live_messages')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}
```

### Task 6.2: Create useLiveMessages hook

**Files:**
- Create: `src/hooks/useLiveMessages.ts`

**Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { insforge } from '../lib/insforge'
import { sendLiveMessage, getLiveMessages } from '../lib/database'
import { useInsforgeRealtime } from './useInsforgeRealtime'

export interface LiveMessage {
  id: string
  event_id: string
  author_name: string
  message: string
  is_approved: boolean
  created_at: string
}

export function useLiveMessages(eventId?: string) {
  const [messages, setMessages] = useState<LiveMessage[]>([])
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const { on } = useInsforgeRealtime(eventId)

  const fetchMessages = useCallback(async () => {
    if (!eventId) return
    const data = await getLiveMessages(eventId)
    setMessages(data)
  }, [eventId])

  const sendMessage = async (authorName: string, message: string) => {
    if (!eventId) return
    return sendLiveMessage(eventId, authorName, message)
  }

  // Rotate messages every 5 seconds
  useEffect(() => {
    if (messages.length === 0) return
    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % messages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [messages.length])

  // Subscribe to new messages
  useEffect(() => {
    if (!eventId) return
    on('INSERT_live_message', (payload: any) => {
      setMessages(prev => [payload.new, ...prev].slice(0, 50))
    })
  }, [eventId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return { messages, currentMessage: messages[currentMessageIndex], sendMessage, refetch: fetchMessages }
}
```

### Task 6.3: Create LiveMessageForm component

**Files:**
- Create: `src/components/event/LiveMessageForm.tsx`

**Step 1: Create the component**

```tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, User } from 'lucide-react'
import { useLiveMessages } from '../../hooks/useLiveMessages'

interface LiveMessageFormProps {
  eventId: string
}

export default function LiveMessageForm({ eventId }: LiveMessageFormProps) {
  const { t } = useTranslation()
  const { sendMessage } = useLiveMessages(eventId)
  const [authorName, setAuthorName] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setIsSending(true)
    try {
      await sendMessage(authorName || 'Anónimo', message)
      setMessage('')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder={t('livewall.name', 'Tu nombre')}
          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
        />
      </div>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('livewall.placeholder', 'Escribe un mensaje...')}
        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
        required
      />
      <button
        type="submit"
        disabled={isSending || !message.trim()}
        className="px-4 py-2 bg-pink-600 text-white rounded-r-lg hover:bg-pink-700 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  )
}
```

### Task 6.4: Create LiveWallOverlay component (for TV Mode)

**Files:**
- Create: `src/components/event/LiveWallOverlay.tsx`

**Step 1: Create the component**

```tsx
import { useEffect } from 'react'
import { useLiveMessages } from '../../hooks/useLiveMessages'

interface LiveWallOverlayProps {
  eventId: string
}

export default function LiveWallOverlay({ eventId }: LiveWallOverlayProps) {
  const { currentMessage } = useLiveMessages(eventId)

  if (!currentMessage) return null

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 animate-fade-in-out">
      <div className="bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 text-center max-w-lg">
        <p className="text-white text-lg font-medium">{currentMessage.message}</p>
        <p className="text-white/60 text-sm mt-1">— {currentMessage.author_name}</p>
      </div>
    </div>
  )
}
```

### Task 6.5: Integrate into TV Mode

**Files:**
- Modify: `src/components/TVMode.tsx`

**Step 1: Add LiveWallOverlay**

Add `LiveWallOverlay` component to TV mode, positioned at the bottom center.

### Task 6.6: Integrate into EventPage

**Files:**
- Modify: `src/pages/EventPage.tsx`

**Step 1: Add LiveMessageForm**

Add `LiveMessageForm` below the photo gallery for guests to send messages.

### Task 6.7: Add translations

Add keys:
```json
"livewall": {
  "title": "Muro en Vivo",
  "name": "Tu nombre",
  "placeholder": "Escribe un mensaje...",
  "send": "Enviar"
}
```

### Task 6.8: Build and verify

Run: `npm run build`

---

## Summary

| Feature | Phase | Pro Only | Tables | Edge Functions | Components |
|---------|-------|----------|--------|----------------|------------|
| 1. AI Enhancement | 1 | Yes | photos (columns) | enhance-photo | PhotoEnhancer |
| 2. Reel/Aftermovie | 2 | Yes | event_recaps | generate-reel | ReelPreview |
| 3. Album Archive | 3 | Yes | events (columns) | — | ArchivePrompt |
| 4. Challenges | 4 | No | challenges | — | ChallengeCard, ChallengeCreator, ChallengeLeaderboard |
| 5. Reactions | 5 | No | photo_reactions | — | ReactionBar |
| 6. Live Wall | 6 | No | live_messages | — | LiveMessageForm, LiveWallOverlay |

**Total new tables:** 4 (challenges, photo_reactions, event_recaps, live_messages)
**Total new edge functions:** 2 (enhance-photo, generate-reel)
**Total new components:** 8
**Total new hooks:** 5
**Estimated total effort:** 5-7 days
