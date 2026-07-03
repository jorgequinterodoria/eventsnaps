export type ThemeId = 'default' | 'wedding' | 'birthday' | 'concert' | 'corporate'

export interface ThemeConfig {
  id: ThemeId
  icon: string
  colors: {
    primary: string
    primaryLight: string
    primaryDark: string
    accent: string
    gradient: string
    border: string
    badge: string
  }
  preview: {
    bg: string
    text: string
    border: string
  }
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  default: {
    id: 'default',
    icon: 'Palette',
    colors: {
      primary: 'blue-600',
      primaryLight: 'blue-100',
      primaryDark: 'blue-700',
      accent: 'green-500',
      gradient: 'from-blue-600 to-indigo-600',
      border: 'blue-500',
      badge: 'blue-600',
    },
    preview: { bg: '#2563eb', text: '#ffffff', border: '#1d4ed8' },
  },
  wedding: {
    id: 'wedding',
    icon: 'Heart',
    colors: {
      primary: 'rose-600',
      primaryLight: 'rose-100',
      primaryDark: 'rose-700',
      accent: 'pink-400',
      gradient: 'from-rose-600 to-pink-600',
      border: 'rose-500',
      badge: 'rose-600',
    },
    preview: { bg: '#e11d48', text: '#ffffff', border: '#be123c' },
  },
  birthday: {
    id: 'birthday',
    icon: 'Cake',
    colors: {
      primary: 'amber-500',
      primaryLight: 'amber-100',
      primaryDark: 'amber-600',
      accent: 'purple-400',
      gradient: 'from-amber-500 to-orange-500',
      border: 'amber-400',
      badge: 'amber-500',
    },
    preview: { bg: '#f59e0b', text: '#ffffff', border: '#d97706' },
  },
  concert: {
    id: 'concert',
    icon: 'Music',
    colors: {
      primary: 'violet-600',
      primaryLight: 'violet-100',
      primaryDark: 'violet-700',
      accent: 'fuchsia-400',
      gradient: 'from-violet-600 to-fuchsia-600',
      border: 'violet-500',
      badge: 'violet-600',
    },
    preview: { bg: '#7c3aed', text: '#ffffff', border: '#6d28d9' },
  },
  corporate: {
    id: 'corporate',
    icon: 'Building2',
    colors: {
      primary: 'slate-700',
      primaryLight: 'slate-100',
      primaryDark: 'slate-800',
      accent: 'cyan-500',
      gradient: 'from-slate-700 to-slate-900',
      border: 'slate-600',
      badge: 'slate-700',
    },
    preview: { bg: '#334155', text: '#ffffff', border: '#1e293b' },
  },
}

export function getTheme(themeId: string): ThemeConfig {
  return THEMES[themeId as ThemeId] || THEMES.default
}

export function getThemeClasses(themeId: string) {
  const theme = getTheme(themeId)
  return {
    banner: `bg-${theme.colors.primary} text-white`,
    bannerButton: `bg-${theme.colors.primaryDark} hover:bg-${theme.colors.primaryDark}/90`,
    button: `bg-${theme.colors.primary} hover:bg-${theme.colors.primaryDark} text-white`,
    buttonOutline: `border-2 border-${theme.colors.border} text-${theme.colors.primary} hover:bg-${theme.colors.primaryLight}`,
    badge: `bg-${theme.colors.primaryLight} text-${theme.colors.primary}`,
    gradient: theme.colors.gradient,
    accent: theme.colors.accent,
    border: theme.colors.border,
  }
}
