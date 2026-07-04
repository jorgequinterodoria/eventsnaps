import { useState, useEffect, useCallback } from 'react'
import { insforge } from '../lib/insforge'
import type { EventRecap } from '../lib/insforge'

export function useEventReel(eventId?: string) {
  const [recap, setRecap] = useState<EventRecap | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchRecap = useCallback(async () => {
    if (!eventId) return
    const { data } = await insforge.database
      .from('event_recaps')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setRecap(data)
  }, [eventId])

  // AI reel generation disabled - keep code for future use
  const generateReel = async (musicTrack?: string) => {
    // if (!eventId) return
    // setIsGenerating(true)
    // try {
    //   const { data, error } = await insforge.functions.invoke('generate-reel', {
    //     body: { eventId, musicTrack }
    //   })
    //   if (error) throw error
    //   setRecap(data)
    //   return data
    // } finally {
    //   setIsGenerating(false)
    // }
    console.log('AI reel generation disabled', { eventId, musicTrack })
    return null
  }

  useEffect(() => {
    fetchRecap()
  }, [fetchRecap])

  return { recap, isGenerating, generateReel, refetch: fetchRecap }
}
