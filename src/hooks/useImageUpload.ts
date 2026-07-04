import { useState } from 'react'
import { uploadPhoto } from '../lib/database'
import { checkFeature } from '../lib/subscription'
// import { insforge } from '../lib/insforge' // AI moderation disabled
import type { Event as EventType } from '../lib/insforge'

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
                if (file.type.startsWith('image/')) {
                    const photo = await uploadPhoto(event.id, file)
                    addPhoto(photo)
                    emit('photo:uploaded', { eventId: event.id, photoId: photo.id })

                    // AI moderation disabled - keep code for future use
                    // if (event.moderation_enabled && photo.status === 'pending') {
                    //     moderatePhoto(photo.storage_path).then((result) => {
                    //         if (result?.suggestion) {
                    //             const newStatus = result.suggestion === 'reject' ? 'rejected' : 'approved'
                    //             insforge.database
                    //                 .from('photos')
                    //                 .update({ status: newStatus })
                    //                 .eq('id', photo.id)
                    //                 .then(() => {
                    //                     insforge.database
                    //                         .from('moderation_queues')
                    //                         .update({ processed: true, gemini_suggestion: result.suggestion, confidence_score: result.confidence })
                    //                         .eq('photo_id', photo.id)
                    //                         .then(() => {
                    //                             addPhoto({ ...photo, status: newStatus })
                    //                         })
                    //                 })
                    //         }
                    //     })
                    // }
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
