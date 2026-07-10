import { useState, useEffect, useCallback } from 'react'
import { getPendingCount, removeItem, getPendingItems, getFileForPhoto, type StoredItem } from '../lib/offline-queue'
import { uploadPhoto, sendLiveMessage } from '../lib/database'
import { useAlert } from '../contexts/AlertContext'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(getPendingCount())
  const [isSyncing, setIsSyncing] = useState(false)
  const { showAlert } = useAlert()

  const refreshCount = useCallback(() => {
    setPendingCount(getPendingCount())
  }, [])

  const processItem = async (item: StoredItem) => {
    try {
      if (item.type === 'photo') {
        const p = item.payload as { eventId: string; caption?: string; uploaderId?: string }
        const file = getFileForPhoto(item.id)
        if (!file) throw new Error('Archivo no disponible, debes seleccionarlo de nuevo')
        await uploadPhoto(p.eventId, file, p.caption, p.uploaderId)
      } else if (item.type === 'live_message') {
        const p = item.payload as { eventId: string; authorName: string; message: string }
        await sendLiveMessage(p.eventId, p.authorName, p.message)
      }
      removeItem(item.id)
      refreshCount()
    } catch {
      /* keep in queue for next retry */
    }
  }

  const syncAll = useCallback(async () => {
    if (!navigator.onLine) return
    setIsSyncing(true)
    const items = getPendingItems()
    let success = 0
    for (const item of items) {
      try {
        await processItem(item)
        success++
      } catch {
        /* skip failed items */
      }
    }
    refreshCount()
    setIsSyncing(false)
    if (success > 0) {
      showAlert(`${success} ${success === 1 ? 'elemento sincronizado' : 'elementos sincronizados'}`, 'Offline')
    }
  }, [refreshCount, showAlert])

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true)
      syncAll()
    }
    const goOffline = () => {
      setIsOnline(false)
    }
    const onStorage = () => refreshCount()

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('storage', onStorage)
    }
  }, [syncAll, refreshCount])

  return { isOnline, pendingCount, isSyncing, syncAll, refreshCount }
}
