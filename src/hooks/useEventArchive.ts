import { useState } from 'react'
import JSZip from 'jszip'
import { downloadPhotoBlob } from '../lib/database'
import type { Event as EventType, Photo } from '../lib/insforge'

interface UseEventArchiveProps {
    event: EventType | null
    photos: Photo[]
    visiblePhotos: Photo[]
    showAlert: (msg: string, title?: string) => void
}

export function useEventArchive({ event, photos, visiblePhotos, showAlert }: UseEventArchiveProps) {
    const [isDownloadingZip, setIsDownloadingZip] = useState(false)
    const [selectMode, setSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isDownloadingSelected, setIsDownloadingSelected] = useState(false)

    const downloadAllAsZip = async () => {
        if (!event || visiblePhotos.length === 0) return
        setIsDownloadingZip(true)
        try {
            const zip = new JSZip()
            for (const p of visiblePhotos) {
                const blob = await downloadPhotoBlob(p.storage_path)
                const parts = p.storage_path.split('/')
                const name = parts[parts.length - 1]
                zip.file(name, blob)
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `evento_${event.code}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch {
            showAlert('No se pudo descargar el ZIP. Intenta nuevamente.', 'Error')
        } finally {
            setIsDownloadingZip(false)
        }
    }

    const toggleSelectMode = () => {
        setSelectMode((v) => {
            if (v) setSelectedIds(new Set())
            return !v
        })
    }

    const toggleSelectPhoto = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const selectAll = () => {
        setSelectedIds(new Set(visiblePhotos.map((p) => p.id)))
    }

    const clearSelection = () => {
        setSelectedIds(new Set())
    }

    const disableSelectMode = () => {
        setSelectMode(false)
        setSelectedIds(new Set())
    }

    const downloadSelectedZip = async () => {
        if (!event || selectedIds.size === 0) return
        setIsDownloadingSelected(true)
        try {
            const zip = new JSZip()
            const ids = new Set(selectedIds)
            for (const p of photos) {
                if (ids.has(p.id)) {
                    const blob = await downloadPhotoBlob(p.storage_path)
                    const parts = p.storage_path.split('/')
                    const name = parts[parts.length - 1]
                    zip.file(name, blob)
                }
            }
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `evento_${event.code}_seleccion.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch {
            showAlert('No se pudo descargar el ZIP seleccionado. Intenta nuevamente.', 'Error')
        } finally {
            setIsDownloadingSelected(false)
        }
    }

    return {
        isDownloadingZip,
        isDownloadingSelected,
        selectMode,
        selectedIds,
        downloadAllAsZip,
        downloadSelectedZip,
        toggleSelectMode,
        toggleSelectPhoto,
        selectAll,
        clearSelection,
        disableSelectMode
    }
}
