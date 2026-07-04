import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { APP_CONFIG } from '../constants/config'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateEventCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < APP_CONFIG.CODE_LENGTH; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export function formatTimeRemaining(expiresAt: string): string {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()

  if (diff <= 0) return 'Expirado'

  const MS_PER_HOUR = APP_CONFIG.MS_PER_SECOND * APP_CONFIG.SECONDS_PER_MINUTE * APP_CONFIG.MINUTES_PER_HOUR
  const MS_PER_MINUTE = APP_CONFIG.MS_PER_SECOND * APP_CONFIG.SECONDS_PER_MINUTE

  const hours = Math.floor(diff / MS_PER_HOUR)
  const minutes = Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE)

  if (hours > 0) {
    return `${hours}h ${minutes}m restantes`
  }
  return `${minutes}min restantes`
}

export function isEventExpired(expiresAt: string): boolean {
  return new Date(expiresAt) <= new Date()
}