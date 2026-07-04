import { useState, useEffect, useCallback } from 'react'
import { getEventChallenges, createChallenge, getChallengeLeaderboard } from '../lib/database'
import { useAlert } from '../contexts/AlertContext'
import type { Challenge } from '../lib/insforge'

export function useChallenges(eventId?: string) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const { showAlert } = useAlert()

  const fetchChallenges = useCallback(async () => {
    if (!eventId) return
    const data = await getEventChallenges(eventId)
    setChallenges(data)
  }, [eventId])

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
  }, [fetchChallenges])

  return { challenges, activeChallenge, setActiveChallenge, leaderboard, loadLeaderboard, addChallenge, isCreating, refetch: fetchChallenges }
}
