import { useLiveMessages } from '../../hooks/useLiveMessages'

interface LiveWallOverlayProps {
  eventId: string
}

export default function LiveWallOverlay({ eventId }: LiveWallOverlayProps) {
  const { currentMessage } = useLiveMessages(eventId)

  if (!currentMessage) return null

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-black/60 backdrop-blur-sm rounded-xl px-6 py-3 text-center max-w-lg animate-pulse">
        <p className="text-white text-lg font-medium">{currentMessage.message}</p>
        <p className="text-white/60 text-sm mt-1">— {currentMessage.author_name}</p>
      </div>
    </div>
  )
}
