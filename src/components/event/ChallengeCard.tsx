import { useTranslation } from 'react-i18next'
import { Trophy, Award } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Challenge } from '../../lib/insforge'

interface ChallengeCardProps {
  challenge: Challenge
  isActive: boolean
  onSelect: () => void
}

export default function ChallengeCard({ challenge, isActive, onSelect }: ChallengeCardProps) {
  const { t } = useTranslation()

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all",
        isActive
          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-yellow-300"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 dark:text-gray-100">{challenge.title}</h4>
          {challenge.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{challenge.description}</p>
          )}
        </div>
        {isActive && <Trophy className="h-5 w-5 text-yellow-500" />}
      </div>
      {challenge.prize && (
        <div className="flex items-center gap-2 mt-3 text-sm text-amber-600 dark:text-amber-400">
          <Award className="h-4 w-4" />
          <span>{challenge.prize}</span>
        </div>
      )}
    </button>
  )
}
