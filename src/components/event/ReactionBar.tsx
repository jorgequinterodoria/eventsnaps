import { useEffect } from 'react'
import { cn } from '../../lib/utils'
import { useReactions } from '../../hooks/useReactions'

const EMOJI_OPTIONS = ['❤️', '🔥', '😂', '😮', '👏', '🎉']

interface ReactionBarProps {
  photoId: string
  eventId: string
}

export default function ReactionBar({ photoId, eventId }: ReactionBarProps) {
  const { reactions, toggleReaction, fetchReactions } = useReactions(eventId)

  useEffect(() => {
    fetchReactions(photoId)
  }, [photoId, fetchReactions])

  const photoReactions = reactions.get(photoId) || []

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EMOJI_OPTIONS.map(emoji => {
        const reaction = photoReactions.find(r => r.emoji === emoji)
        return (
          <button
            key={emoji}
            onClick={() => toggleReaction(photoId, emoji)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-2 min-h-[44px] rounded-full text-sm transition-all",
              reaction?.userReacted
                ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300"
                : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
            )}
          >
            <span>{emoji}</span>
            {reaction && reaction.count > 0 && (
              <span className="text-xs text-gray-600 dark:text-gray-400">{reaction.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
