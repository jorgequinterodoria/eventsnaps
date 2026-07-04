import { useState } from 'react'
// import { insforge } from '../lib/insforge' // AI enhancement disabled
// import { useAlert } from '../contexts/AlertContext' // AI enhancement disabled

export type EnhancementType = 'enhance' | 'remove_bg' | 'filter' | 'sticker'
export type FilterPreset = 'vintage' | 'neon' | 'black_white' | 'warm' | 'cool' | 'dramatic'

// AI enhancement disabled - keep code for future use
export function usePhotoEnhancement() {
  const [isEnhancing, setIsEnhancing] = useState(false)
  // const { showAlert } = useAlert()

  const enhancePhoto = async (
    photoId: string,
    storagePath: string,
    type: EnhancementType,
    filterPreset?: FilterPreset,
    eventTheme?: string
  ) => {
    // AI disabled - show message instead
    // setIsEnhancing(true)
    // try {
    //   const { data, error } = await insforge.functions.invoke('enhance-photo', {
    //     body: {
    //       storagePath,
    //       enhancementType: type,
    //       filterPreset: filterPreset || 'vintage',
    //       eventTheme,
    //       insforgeUrl: import.meta.env.VITE_INSFORGE_URL,
    //       anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY
    //     }
    //   })
    //
    //   if (error) throw error
    //
    //   await insforge.database
    //     .from('photos')
    //     .update({
    //       enhanced_url: data.enhancedUrl,
    //       ai_metadata: {
    //         ...data.metadata,
    //         filter_applied: filterPreset,
    //         enhancement_version: 1
    //       }
    //     })
    //     .eq('id', photoId)
    //
    //   return data
    // } catch (err) {
    //   showAlert('Error enhancing photo', 'Error')
    //   throw err
    // } finally {
    //   setIsEnhancing(false)
    // }
    console.log('AI enhancement disabled', { photoId, storagePath, type, filterPreset, eventTheme })
    return null
  }

  return { enhancePhoto, isEnhancing }
}
