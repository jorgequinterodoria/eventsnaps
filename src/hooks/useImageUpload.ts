import { useState } from 'react'
import { uploadPhoto } from '../lib/database'
import { checkFeature } from '../lib/subscription'
import type { Event as EventType } from '../lib/insforge'

interface UseImageUploadProps {
    event: EventType | null
    addPhoto: (photo: any) => void
    emit: (event: string, payload: any) => void
    showAlert: (msg: string, title?: string) => void
}

export function useImageUpload({ event, addPhoto, emit, showAlert }: UseImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false)

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || !event) return

        // Feature gate: gallery upload requires the gallery feature
        if (event.creator_id && event.creator_id !== 'anonymous') {
            const gate = await checkFeature(event.creator_id, 'gallery')
            if (!gate.allowed) {
                showAlert(gate.message ?? 'Mejora tu plan para usar esta función', 'Plan requerido')
                return
            }
        }

        setIsUploading(true)
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                if (file.type.startsWith('image/')) {
                    const photo = await uploadPhoto(event.id, file)
                    addPhoto(photo)
                    emit('photo:uploaded', { eventId: event.id, photoId: photo.id })
                }
            }
        } catch {
            showAlert('Failed to upload photo. Please try again.', 'Error')
        } finally {
            setIsUploading(false)
        }
    }

    return { isUploading, handleFileUpload }
}
