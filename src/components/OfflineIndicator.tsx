import { useOfflineSync } from '../hooks/useOfflineSync'

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncAll } = useOfflineSync()

  if (isOnline && pendingCount === 0) return null

  return (
    <>
      {!isOnline && (
        <div className="fixed top-2 right-2 z-50 bg-amber-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Offline
          {pendingCount > 0 && <span>({pendingCount})</span>}
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <button
          onClick={syncAll}
          disabled={isSyncing}
          className="fixed top-2 right-2 z-50 bg-blue-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Sync...
            </>
          ) : (
            <>
              <span>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
              <span className="underline">Subir</span>
            </>
          )}
        </button>
      )}
    </>
  )
}
