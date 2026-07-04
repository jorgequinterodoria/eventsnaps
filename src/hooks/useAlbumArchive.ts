import { useState } from 'react'
import { insforge } from '../lib/insforge'
import { useAlert } from '../contexts/AlertContext'

export function useAlbumArchive(eventId?: string) {
  const [isArchiving, setIsArchiving] = useState(false)
  const { showAlert } = useAlert()

  const archiveEvent = async () => {
    if (!eventId) return
    setIsArchiving(true)
    try {
      const { error } = await insforge.database
        .from('events')
        .update({
          archived: true,
          archive_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', eventId)
      if (error) throw error
      showAlert('Álbum guardado permanentemente por 30 días', 'Éxito')
    } catch {
      showAlert('Error al guardar álbum', 'Error')
    } finally {
      setIsArchiving(false)
    }
  }

  const exportToGooglePhotos = async () => {
    showAlert('Exportación a Google Photos próximamente', 'Próximamente')
  }

  const exportToDrive = async () => {
    showAlert('Exportación a Google Drive próximamente', 'Próximamente')
  }

  return { archiveEvent, exportToGooglePhotos, exportToDrive, isArchiving }
}
