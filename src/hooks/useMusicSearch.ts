import { useState, useCallback } from 'react'
import debounce from 'lodash.debounce'
import { searchTracks, type Track } from '../lib/music-provider'

export function useMusicSearch(provider: 'spotify' | 'youtube') {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Track[]>([])
    const [loading, setLoading] = useState(false)

    const debouncedSearch = useCallback(
        debounce(async (q: string) => {
            if (!q.trim()) return
            setLoading(true)
            try {
                const tracks = await searchTracks(q, provider)
                setResults(tracks)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }, 500),
        [provider]
    )

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setQuery(val)
        if (val.trim()) {
            debouncedSearch(val)
        } else {
            setResults([])
        }
    }

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            debouncedSearch.cancel()
            debouncedSearch(query)
            debouncedSearch.flush()
        }
    }

    const clearSearch = () => {
        setQuery('')
        setResults([])
    }

    return {
        query,
        results,
        loading,
        handleSearchChange,
        handleManualSubmit,
        clearSearch
    }
}
