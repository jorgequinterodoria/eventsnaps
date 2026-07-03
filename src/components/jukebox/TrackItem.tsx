import { Plus, Music } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Track } from '../../lib/music-provider'

interface TrackItemProps {
  track: Track
  isAdmin: boolean
  onAdd: (track: Track) => void
  onPlay: (track: Track) => void
}

export function TrackItem({ track, isAdmin, onAdd, onPlay }: TrackItemProps) {
  const { t } = useTranslation()
  return (
    <li className="p-3 border-b flex justify-between items-center hover:bg-gray-50">
      <div className="flex items-center flex-1 min-w-0">
        {track.album_art ? (
          <img src={track.album_art} className="h-10 w-10 rounded mr-3 object-cover flex-shrink-0" alt="Album art" />
        ) : (
          <div className="h-10 w-10 bg-gray-200 rounded mr-3 flex items-center justify-center flex-shrink-0">
            <Music className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <div className="overflow-hidden">
          <div className="font-medium truncate">{track.title}</div>
          <div className="text-sm text-gray-500 truncate">{track.artist}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <button onClick={() => onAdd(track)} className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200">
          <Plus className="h-5 w-5" />
        </button>
        {isAdmin && (
          <button onClick={() => onPlay(track)} className="px-3 py-2 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
            Now Playing
          </button>
        )}
      </div>
    </li>
  )
}
