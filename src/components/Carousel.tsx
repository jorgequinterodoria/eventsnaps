import { useEffect, useMemo, useState } from 'react'
import type { Photo } from '@/lib/insforge'
import { getPhotoUrl } from '@/lib/database'
import { Play, Pause, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CarouselProps {
  photos: Photo[]
  startIndex?: number
  autoPlay?: boolean
  intervalMs?: number
  onClose?: () => void
}

const Carousel = ({ photos, startIndex = 0, autoPlay = true, intervalMs = 5000, onClose }: CarouselProps) => {
  const [current, setCurrent] = useState(startIndex)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [isFading, setIsFading] = useState(false)

  const safePhotos = useMemo(() => photos || [], [photos])

  useEffect(() => {
    let timer: number | undefined
    if (isPlaying && safePhotos.length > 1) {
      timer = window.setTimeout(() => {
        setCurrent((prev) => (prev + 1) % safePhotos.length)
      }, intervalMs)
    }
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [isPlaying, current, intervalMs, safePhotos.length])

  useEffect(() => {
    const load = async () => {
      setIsFading(false)
      const url = await getPhotoUrl(safePhotos[current]?.storage_path || '')
      setImageUrl(url)
      requestAnimationFrame(() => setIsFading(true))
    }
    if (safePhotos[current]) load()
  }, [current, safePhotos])

  const prev = () => {
    setCurrent((prev) => (prev - 1 + safePhotos.length) % safePhotos.length)
  }

  const next = () => {
    setCurrent((prev) => (prev + 1) % safePhotos.length)
  }

  if (safePhotos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        No hay fotos para mostrar
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-black/90">
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={imageUrl}
          alt={safePhotos[current]?.caption || 'Foto'}
          className={cn(
            'max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl',
            'transition-opacity duration-700',
            isFading ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-4 z-20">
        <button
          onClick={prev}
          className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setIsPlaying((p) => !p)}
          className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center space-x-2"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
        </button>
        <button
          onClick={next}
          className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute bottom-6 right-6 z-20 text-white text-sm">
        {current + 1} / {safePhotos.length}
      </div>
    </div>
  )
}

export default Carousel
