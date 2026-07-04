import { useState, useCallback, useEffect } from 'react'
import { addReaction, removeReaction, getPhotoReactions } from '../lib/database'
import { useInsforgeRealtime } from './useInsforgeRealtime'

export interface Reaction {
  emoji: string
  count: number
  userReacted?: boolean
}

function getOrCreateSessionId(): string {
  let id = localStorage.getItem('eventsnaps_session_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('eventsnaps_session_id', id)
  }
  return id
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
      userReacted: false
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

    await fetchReactions(photoId)
  }, [reactions, sessionId, fetchReactions])

  useEffect(() => {
    on('INSERT_photo_reaction', async (payload: any) => {
      const photoId = payload.new?.photo_id
      if (photoId) await fetchReactions(photoId)
    })
    on('DELETE_photo_reaction', async (payload: any) => {
      const photoId = payload.old?.photo_id
      if (photoId) await fetchReactions(photoId)
    })
  }, [on, fetchReactions])

  return { reactions, toggleReaction, fetchReactions }
}
