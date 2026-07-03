# Premium Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 premium features to Eventsnaps: visual themes, TV/kiosk mode, customizable landing page, dark/light mode, and multi-language support.

**Architecture:** Each feature is independent and can be implemented in any order. All share the existing InsForge backend (database, auth, storage). Dark mode and i18n are cross-cutting infrastructure; themes, TV mode, and landing page are feature-specific.

**Tech Stack:** React 19 + Vite, TypeScript, Tailwind CSS 3.4, Zustand, i18next, react-i18next, Lucide React

---

## Phase 0: Database Schema Changes

**Files:**
- Modify: `database_schema.sql` (add columns)
- Execute: via `npx @insforge/cli db query`

### Step 1: Add theme column to events table

**Run:**
```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'default';
```

### Step 2: Add landing_config column to events table

**Run:**
```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS landing_config jsonb DEFAULT '{}'::jsonb;
```

### Step 3: Add themes boolean to plans features

The `plans.features` JSONB already supports arbitrary keys. We will reference `features->>'themes'` in code (defaults to `false` for basic, `true` for pro). No SQL change needed since the JSONB schema is flexible.

### Step 4: Add allowed_themes to user_profiles for creator-level theme override

**Run:**
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'default';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS locale text DEFAULT 'es';
```

---

## Phase 1: Multi-Language Support (i18n)

**Goal:** Support Spanish (es), English (en), Portuguese (pt), French (fr). Auto-detect browser language, allow manual switching.

### Task 1.1: Install i18next dependencies

**Run:**
```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

### Task 1.2: Create i18n configuration

**Create:** `src/lib/i18n.ts`

```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import es from '../locales/es.json'
import en from '../locales/en.json'
import pt from '../locales/pt.json'
import fr from '../locales/fr.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en }, pt: { translation: pt }, fr: { translation: fr } },
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] }
  })

export default i18n
```

### Task 1.3: Create locale JSON files

**Create:** `src/locales/es.json` — copy all existing Spanish strings from the app
**Create:** `src/locales/en.json` — English translations
**Create:** `src/locales/pt.json` — Portuguese translations
**Create:** `src/locales/fr.json` — French translations

Each file mirrors the same keys. Key structure is grouped by component/page:
```json
{
  "nav": {
    "home": "Inicio",
    "createEvent": "Crear Evento",
    "joinEvent": "Unirse a Evento",
    "plans": "Planes"
  },
  "event": {
    "welcomeTo": "Bienvenido a",
    "photoGallery": "Galería de Fotos",
    "interactivePlaylist": "Playlist Interactiva",
    "uploadPhotos": "Sube fotos para compartir",
    "dragAndDrop": "Arrastra y suelta tus fotos aquí, o haz clic para seleccionar",
    "noPhotosYet": "Aún no hay fotos",
    "eventExpired": "Este evento ha expirado. No se pueden subir más fotos.",
    "underModeration": "Las fotos nuevas aparecen como \"En moderación\" mientras la IA las revisa."
  },
  "jukebox": {
    "searchSongs": "Buscar canciones...",
    "addToQueue": "Añadir a la cola",
    "queue": "Cola de reproducción",
    "nowPlaying": "Sonando ahora",
    "noTracks": "No hay canciones en la cola",
    "votes": "votos",
    "play": "Reproducir"
  },
  "common": {
    "loading": "Cargando...",
    "error": "Error",
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "back": "Volver",
    "copy": "Copiar",
    "copied": "¡Copiado!",
    "minutesRemaining": "min restantes",
    "hoursRemaining": "h {hours}m restantes"
  }
}
```

### Task 1.4: Add i18n initialization to main.tsx

**Modify:** `src/main.tsx` — import `./lib/i18n` before rendering

### Task 1.5: Create LanguageSwitcher component

**Create:** `src/components/LanguageSwitcher.tsx`

A small dropdown in the Navigation bar showing flag emoji + language name. Uses `useTranslation()` from react-i18next and `i18n.changeLanguage()`.

### Task 1.6: Replace all hardcoded strings with t() calls

**Modify:** Every component and page. The scale of this task is large — roughly 30 files. Each file needs its static JSX strings wrapped in `t('key')`. The i18n key structure mirrors the component hierarchy.

Key files to modify:
- `src/components/Navigation.tsx`
- `src/components/Footer.tsx`
- `src/components/event/PhotoCard.tsx`
- `src/components/event/EventActionButtons.tsx`
- `src/components/jukebox/TrackItem.tsx`
- `src/pages/Home.tsx`
- `src/pages/EventPage.tsx`
- `src/pages/JukeboxPage.tsx`
- `src/pages/AuthPage.tsx`
- `src/pages/CreateEvent.tsx`
- `src/pages/JoinEvent.tsx`
- `src/pages/PricingPage.tsx`
- `src/pages/ProfilePage.tsx`
- `src/pages/ModerationPage.tsx`
- `src/pages/AdminDashboard.tsx`
- All admin panel components
- `src/contexts/AlertContext.tsx` (modal button text)
- `src/lib/database.ts` (error messages)
- `src/lib/utils.ts` (`formatTimeRemaining`)

---

## Phase 2: Dark/Light Mode

**Goal:** Add theme toggle persisted to localStorage, applied via `dark` class on `<html>`, with full `dark:` Tailwind variants.

### Task 2.1: Create ThemeContext

**Create:** `src/contexts/ThemeContext.tsx`

```typescript
type Theme = 'light' | 'dark'
interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}
```

- Reads initial value from `localStorage.getItem('theme')` or system preference via `matchMedia('(prefers-color-scheme: dark)')`
- Sets/removes `dark` class on `document.documentElement`
- Persists to localStorage on change
- Provides `theme` and `toggleTheme` via context

### Task 2.2: Wrap app in ThemeProvider

**Modify:** `src/main.tsx` — wrap `<App />` with `<ThemeProvider>`

### Task 2.3: Add theme toggle to Navigation

**Modify:** `src/components/Navigation.tsx` — add sun/moon icon button that calls `toggleTheme()`

### Task 2.4: Create dark mode CSS custom properties

**Modify:** `src/index.css`

```css
:root {
  --bg-primary: #f9fafb;
  --bg-secondary: #ffffff;
  --bg-tertiary: #f3f4f6;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-muted: #6b7280;
  --border-color: #d1d5db;
  --card-bg: #ffffff;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.1);
  --input-bg: #ffffff;
}

.dark {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-muted: #9ca3af;
  --border-color: #4b5563;
  --card-bg: #1f2937;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.3);
  --input-bg: #374151;
}
```

### Task 2.5: Add dark: variants to all components

This is the bulk of the work. Every `.tsx` file needs `dark:` Tailwind classes added. Rather than converting every file, use the CSS variable approach where possible:

- `bg-gray-50` → `bg-[var(--bg-primary)]`
- `bg-white` → `bg-[var(--bg-secondary)]` 
- `text-gray-900` → `text-[var(--text-primary)]`
- `text-gray-600` → `text-[var(--text-secondary)]`
- `border-gray-300` → `border-[var(--border-color)]`

This approach means we add the CSS variables once and components inherit them without needing `dark:` on every class. Only for specific dark-mode-only visual changes (like shadows, overlays) do we use `dark:`.

**Alternative approach (recommended for this codebase):** Add `dark:` variants alongside existing classes. Use search-and-replace patterns:

- `bg-gray-50` → `bg-gray-50 dark:bg-gray-900`
- `bg-white` → `bg-white dark:bg-gray-800`
- `text-gray-900` → `text-gray-900 dark:text-gray-100`
- `text-gray-600` → `text-gray-600 dark:text-gray-400`

But this is more repetitive. The CSS variable approach is cleaner for a conversion of this scale. Use a hybrid: CSS variables for the common patterns, `dark:` for edge cases.

---

## Phase 3: Visual Themes by Event Type

**Goal:** 5 theme presets (Default, Wedding, Birthday, Concert, Corporate) with unique color palettes, applied per-event and persisted in DB.

### Task 3.1: Define theme presets

**Create:** `src/lib/themes.ts`

```typescript
export type ThemeId = 'default' | 'wedding' | 'birthday' | 'concert' | 'corporate'

export interface ThemeConfig {
  id: ThemeId
  labelKey: string  // i18n key
  icon: string       // Lucide icon name
  colors: {
    primary: string      // Tailwind blue-600 equivalent
    primaryLight: string  // bg tint
    primaryDark: string   // hover/darker
    accent: string        // secondary accent
    gradient: string      // gradient classes
    border: string
    badge: string
  }
  previewColor: string  // hex for preview swatch
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  default: {
    id: 'default', labelKey: 'themes.default', icon: 'Palette',
    colors: { primary: 'blue-600', primaryLight: 'blue-100', primaryDark: 'blue-700', accent: 'green-500', gradient: 'from-blue-600 to-indigo-600', border: 'blue-500', badge: 'blue-600' },
    previewColor: '#2563eb'
  },
  wedding: {
    id: 'wedding', labelKey: 'themes.wedding', icon: 'Heart',
    colors: { primary: 'rose-600', primaryLight: 'rose-100', primaryDark: 'rose-700', accent: 'pink-400', gradient: 'from-rose-600 to-pink-600', border: 'rose-500', badge: 'rose-600' },
    previewColor: '#e11d48'
  },
  birthday: {
    id: 'birthday', labelKey: 'themes.birthday', icon: 'Cake',
    colors: { primary: 'amber-500', primaryLight: 'amber-100', primaryDark: 'amber-600', accent: 'purple-400', gradient: 'from-amber-500 to-orange-500', border: 'amber-400', badge: 'amber-500' },
    previewColor: '#f59e0b'
  },
  concert: {
    id: 'concert', labelKey: 'themes.concert', icon: 'Music',
    colors: { primary: 'violet-600', primaryLight: 'violet-100', primaryDark: 'violet-700', accent: 'fuchsia-400', gradient: 'from-violet-600 to-fuchsia-600', border: 'violet-500', badge: 'violet-600' },
    previewColor: '#7c3aed'
  },
  corporate: {
    id: 'corporate', labelKey: 'themes.corporate', icon: 'Building2',
    colors: { primary: 'slate-700', primaryLight: 'slate-100', primaryDark: 'slate-800', accent: 'cyan-500', gradient: 'from-slate-700 to-slate-900', border: 'slate-600', badge: 'slate-700' },
    previewColor: '#334155'
  }
}
```

### Task 3.2: Create useTheme hook that applies theme CSS vars

**Create:** `src/hooks/useEventTheme.ts`

```typescript
export function useEventTheme(themeId: ThemeId) {
  const config = THEMES[themeId] || THEMES.default
  // Sets CSS custom properties on the event container
  // Returns { config, containerClass: `theme-${themeId}` }
}
```

### Task 3.3: Add theme selector to CreateEvent

**Modify:** `src/pages/CreateEvent.tsx` — after duration picker, add a theme selector grid showing 5 theme cards with color swatches, icon, and label. On Pro plans, all 5 are available; on Basic, only `default`.

### Task 3.4: Apply theme on EventPage

**Modify:** `src/pages/EventPage.tsx` — read `event.theme`, apply theme CSS custom properties to root div, pass theme-aware classes to child components.

### Task 3.5: Update the EventActionButtons to use theme colors

**Modify:** `src/components/event/EventActionButtons.tsx` — use `var(--theme-primary)` or `var(--theme-accent)` for button backgrounds.

### Task 3.6: Extend PlanFeatures type

**Modify:** `src/lib/insforge.ts` — add `themes: boolean` to `PlanFeatures`

---

## Phase 4: Customizable Landing Page

**Goal:** Creator can set cover image, headline, and accent color for their event landing page. Stored in `events.landing_config` JSONB.

### Task 4.1: Define LandingConfig type

**Add to:** `src/lib/insforge.ts`

```typescript
export interface LandingConfig {
  cover_url?: string
  headline?: string
  subheadline?: string
  primary_color?: string
  show_gallery_button?: boolean
  show_jukebox_button?: boolean
}
```

### Task 4.2: Create landing page editor UI

**Create:** `src/components/event/LandingEditor.tsx`

Form with:
- Cover image URL input (with preview)
- Headline text input (defaults to "Bienvenido a {event.code}")
- Subheadline text input (defaults to empty)
- Color picker for primary accent color
- Toggle switches for showing gallery button / jukebox button
- Save button that writes to `events.landing_config`

Shown only to the event creator. Gated behind feature flag.

### Task 4.3: Update landing page render in EventPage

**Modify:** `src/pages/EventPage.tsx` — the landing page mode (`mode === 'landing'`) reads `event.landing_config` and renders:
- Cover image as background (if `cover_url`)
- Custom headline / subheadline
- Theme-colored buttons
- Edit button for creator

### Task 4.4: Add LandingConfig to plans gating

The `white_label` feature flag already gates custom branding. The landing editor should check `white_label` or a new `custom_landing` feature.

---

## Phase 5: Native TV / Kiosk Mode

**Goal:** Full-screen auto-playing view with photo slideshow + now-playing jukebox overlay. Activated via URL param `/event/:code?mode=tv`.

### Task 5.1: Add TV mode detection to EventPage

**Modify:** `src/pages/EventPage.tsx` — check URL search params for `mode=tv`. If present, render TV mode.

### Task 5.2: Create TV mode component

**Create:** `src/components/TVMode.tsx`

Full-screen view with:
- `100vw x 100vh`, no scroll, no navigation
- Photo slideshow: auto-advance every 6 seconds with crossfade
- Overlay showing:
  - Event code (top-right corner)
  - Current song (bottom-left): album art, title, artist
  - Queue count (bottom-right)
- Background: dark gradient overlay on current photo
- Enter fullscreen on mount via `element.requestFullscreen()`
- Exit fullscreen on unmount
- Keyboard: Escape exits TV mode, Space pauses/resumes slideshow

### Task 5.3: Add TV mode access from EventPage

**Modify:** `src/pages/EventPage.tsx` — add a TV icon button in the header that opens `/event/:code?mode=tv` in a new window or navigates in-place.

### Task 5.4: Add TV mode feature gating

The `tv_mode` feature flag already exists in `PlanFeatures`. Gate the TV mode button behind it.

---

## Phase 6: Polish & Integration

### Task 6.1: Add new PlanFeature toggles to admin panel

**Modify:** `src/pages/admin/PlanManagement.tsx` — add `themes` to the boolean features list.

### Task 6.2: Add theme and locale to user profile

**Modify:** `src/pages/ProfilePage.tsx` — add theme preference dropdown and language selector.

### Task 6.3: Add landing config to admin event management

**Modify:** `src/pages/admin/EventManagement.tsx` — show landing config status, link to edit.

### Task 6.4: Build and verify

**Run:**
```bash
npm run build
```
Fix any TypeScript or build errors.

### Task 6.5: Deploy edge functions (if any new ones created)

```bash
npx insforge functions deploy <slug> --file <path>
```

### Task 6.6: Apply database migrations

```bash
npx insforge db query "$(cat migrations/2026-07-03-premium-features.sql)"
```

---

## Migration SQL

**Create:** `migrations/2026-07-03-premium-features.sql`

```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'default';
ALTER TABLE events ADD COLUMN IF NOT EXISTS landing_config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'default';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS locale text DEFAULT 'es';
```

---

## Implementation Order (Recommended)

1. **Phase 1 (i18n)** — must come first because it touches every file; doing it early avoids re-translating new strings
2. **Phase 0 (DB migrations)** — schema changes needed by phases 3, 4
3. **Phase 2 (Dark mode)** — CSS variables approach, integrates with i18n
4. **Phase 3 (Themes)** — depends on DB schema, integrates with EventPage
5. **Phase 4 (Landing page)** — depends on DB schema, integrates with EventPage
6. **Phase 5 (TV mode)** — standalone, depends on EventPage
7. **Phase 6 (Polish)** — admin panel, profile, build verification
