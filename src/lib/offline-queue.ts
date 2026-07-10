const QUEUE_KEY = 'eventsnaps_offline_queue'

export interface PhotoPayload {
  eventId: string
  caption?: string
  uploaderId?: string
  fileName: string
  fileType: string
}

export interface MessagePayload {
  eventId: string
  authorName: string
  message: string
}

export type QueueItemType = 'photo' | 'live_message'

export interface StoredItem {
  id: string
  type: QueueItemType
  timestamp: number
  retries: number
  label: string
  payload: PhotoPayload | MessagePayload
}

const fileMap = new Map<string, File>()

function loadMeta(): StoredItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveMeta(items: StoredItem[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function enqueuePhoto(eventId: string, file: File, caption?: string, uploaderId?: string): string {
  const id = generateId()
  fileMap.set(id, file)
  const item: StoredItem = {
    id,
    type: 'photo',
    timestamp: Date.now(),
    retries: 0,
    label: file.name,
    payload: { eventId, caption, uploaderId, fileName: file.name, fileType: file.type }
  }
  const meta = loadMeta()
  meta.push(item)
  saveMeta(meta)
  return id
}

export function enqueueMessage(eventId: string, authorName: string, message: string): string {
  const id = generateId()
  const item: StoredItem = {
    id,
    type: 'live_message',
    timestamp: Date.now(),
    retries: 0,
    label: `${authorName}: ${message.slice(0, 30)}`,
    payload: { eventId, authorName, message }
  }
  const meta = loadMeta()
  meta.push(item)
  saveMeta(meta)
  return id
}

export function removeItem(id: string) {
  fileMap.delete(id)
  saveMeta(loadMeta().filter(i => i.id !== id))
}

export function incrementRetry(id: string) {
  const meta = loadMeta()
  const item = meta.find(i => i.id === id)
  if (item) {
    item.retries++
    saveMeta(meta)
  }
}

export function getPendingCount(): number {
  return loadMeta().length
}

export function getPendingItems(): StoredItem[] {
  return loadMeta()
}

export function getFileForPhoto(id: string): File | undefined {
  return fileMap.get(id)
}
