import { useState, useEffect, useCallback } from 'react'
import { sendLiveMessage, getLiveMessages } from '../lib/database'
import { useInsforgeRealtime } from './useInsforgeRealtime'
import type { LiveMessage } from '../lib/insforge'

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

  useEffect(() => {
    if (messages.length === 0) return
    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % messages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [messages.length])

  useEffect(() => {
    if (!eventId) return
    on('INSERT_live_message', (payload: any) => {
      setMessages(prev => [payload.new, ...prev].slice(0, 50))
    })
  }, [eventId, on])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return { messages, currentMessage: messages[currentMessageIndex], sendMessage, refetch: fetchMessages }
}
