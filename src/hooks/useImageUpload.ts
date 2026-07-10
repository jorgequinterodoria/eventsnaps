import { useState } from 'react'
import { uploadPhoto } from '../lib/database'
import { checkFeature } from '../lib/subscription'
// import { insforge } from '../lib/insforge' // AI moderation disabled
import type { Event as EventType } from '../lib/insforge'
import { enqueuePhoto } from '../lib/offline-queue'

interface UseImageUploadProps {
    event: EventType | null
    addPhoto: (photo: any) => void
    emit: (event: string, payload: any) => void
    showAlert: (msg: string, title?: string) => void
}

// AI moderation disabled - keep code for future use
// async function moderatePhoto(storagePath: string) {
//     try {
//         const insforgeUrl = import.meta.env.VITE_INSFORGE_URL
//         const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY
//
//         const { data, error } = await insforge.functions.invoke('moderate-photo', {
//             body: { storagePath, insforgeUrl, anonKey }
//         })
//
//         if (error) throw error
//         return data
//     } catch {
//         return null
//     }
// }

export function useImageUpload({ event, addPhoto, emit, showAlert }: UseImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false)

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0 || !event) return

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
                if (!file.type.startsWith('image/')) continue

                if (!navigator.onLine) {
                    const id = enqueuePhoto(event.id, file)
                    addPhoto({
                        id,
                        event_id: event.id,
                        storage_path: `offline/${id}`,
                        storage_url: URL.createObjectURL(file),
                        enhanced_url: null,
                        ai_metadata: null,
                        caption: null,
                        status: 'approved' as const,
                        uploaded_by: 'anonymous',
                        uploaded_at: new Date().toISOString()
                    })
                    showAlert(`${file.name} se agregó a la cola offline`, 'Offline')
                    continue
                }

                const photo = await uploadPhoto(event.id, file)
                addPhoto(photo)
                emit('photo:uploaded', { eventId: event.id, photoId: photo.id })
            }
        } catch {
            showAlert('Error al subir foto. Intenta de nuevo.', 'Error')
        } finally {
            setIsUploading(false)
        }
    }

    return { isUploading, handleFileUpload }
}
