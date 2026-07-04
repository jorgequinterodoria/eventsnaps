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
  }, [challengeId, loadLeaderboard])

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
