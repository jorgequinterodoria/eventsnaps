import { useState, useCallback } from 'react'
import { insforge } from '../lib/insforge'
import { AdminConfigItem } from '../types/admin'
import { useAlert } from '../contexts/AlertContext'

export const useAdminConfig = () => {
    const [clientId, setClientId] = useState('')
    const [clientSecret, setClientSecret] = useState('')
    const [youtubeKey, setYoutubeKey] = useState('')
    const [geminiKey, setGeminiKey] = useState('')
    const { showAlert } = useAlert()

    const loadConfig = useCallback(async () => {
        const { data } = await insforge.database.from('admin_config').select('*')
        if (data) {
            data.forEach((item: AdminConfigItem) => {
                if (item.key === 'spotify_client_id') setClientId(item.value)
                if (item.key === 'spotify_client_secret') setClientSecret(item.value)
                if (item.key === 'youtube_api_key') setYoutubeKey(item.value)
                if (item.key === 'gemini_api_key') setGeminiKey(item.value)
            })
        }
    }, [])

    const saveConfig = async () => {
        const { error } = await insforge.database.from('admin_config').upsert([
            { key: 'spotify_client_id', value: clientId },
            { key: 'spotify_client_secret', value: clientSecret },
            { key: 'youtube_api_key', value: youtubeKey },
            { key: 'gemini_api_key', value: geminiKey }
        ])
        if (error) {
            showAlert('Error al guardar: ' + error.message, 'Error')
        } else {
            showAlert('Configuración guardada')
        }
    }

    return {
        clientId,
        setClientId,
        clientSecret,
        setClientSecret,
        youtubeKey,
        setYoutubeKey,
        geminiKey,
        setGeminiKey,
        loadConfig,
        saveConfig,
    }
}
