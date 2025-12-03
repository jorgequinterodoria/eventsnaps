import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { Upload, Camera, Clock, Users, Shield, ArrowLeft, Copy, Check, Play } from 'lucide-react'
import { cn, formatTimeRemaining, isEventExpired } from '@/lib/utils'
import { getEventByCode, getEventPhotos, uploadPhoto } from '@/lib/database'
import { useStore } from '@/lib/store'
import Carousel from '@/components/Carousel'
import type { Event as EventType, Photo } from '@/lib/supabase'

const EventPage = () =>{
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const { currentEvent, photos, setCurrentEvent, setPhotos, setLoading, setError, addPhoto } = useStore()
  
  const [isUploading, setIsUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [event, setEvent] = useState<EventType | null>(null)
  const [showCarousel, setShowCarousel] = useState(false)

  const loadEventData = useCallback(async () => {
    if (!code) return
    
    setLoading(true)
    try {
      const eventData = await getEventByCode(code.toUpperCase())
      if (eventData) {
        setEvent(eventData)
        setCurrentEvent(eventData)
        const eventPhotos = await getEventPhotos(eventData.id)
        setPhotos(eventPhotos)
      } else {
        setError('Evento no encontrado o expirado')
        navigate('/')
      }
    } catch (error) {
      console.error('Error al cargar el evento:', error)
      setError('Error al cargar el evento')
    } finally {
      setLoading(false)
    }
  }, [code, setCurrentEvent, setPhotos, setLoading, setError, navigate])

  useEffect(() => {
    loadEventData()
  }, [loadEventData])

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !event) return
    
    setIsUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.type.startsWith('image/')) {
          const photo = await uploadPhoto(event.id, file, undefined, user?.id ?? 'anonymous')
          addPhoto(photo)
        }
      }
    } catch (error) {
      console.error('Failed to upload photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFileUpload(e.dataTransfer.files)
  }

  const copyEventCode = async () => {
    if (event) {
      await navigator.clipboard.writeText(event.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando evento...</p>
        </div>
      </div>
    )
  }

  const isExpired = isEventExpired(event.expires_at)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver al inicio
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {formatTimeRemaining(event.expires_at)}
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-1" />
                {photos.length} fotos
              </div>
              
              {event.moderation_enabled && (
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="h-4 w-4 mr-1" />
                  Con moderación
                </div>
              )}

              {photos.length > 0 && (
                <button
                  onClick={() => setShowCarousel(true)}
                  className="ml-4 flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  <Play className="h-4 w-4 mr-1" /> Ver presentación
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event Code Banner */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Código del evento</h1>
              <p className="text-blue-100">Comparte este código para unirte</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-mono font-bold bg-blue-700 px-4 py-2 rounded-lg">
                {event.code}
              </span>
              <button
                onClick={copyEventCode}
                className="flex items-center px-3 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                {copied ? (
                  <><Check className="h-4 w-4 mr-1" /> ¡Copiado!</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> Copiar</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showCarousel && (
          <div className="fixed inset-0 z-50">
            <Carousel photos={photos} onClose={() => setShowCarousel(false)} />
          </div>
        )}
        {/* Upload Section */}
        {!isExpired && (
          <div className="mb-8">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Sube fotos para compartir
              </p>
              <p className="text-gray-600 mb-4">
                Arrastra y suelta tus fotos aquí, o haz clic para seleccionar
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className={cn(
                  "inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md",
                  "text-white bg-blue-600 hover:bg-blue-700 cursor-pointer",
                  "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                  "transition-colors duration-200",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isUploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Subiendo...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Camera className="h-5 w-5 mr-2" />
                    Seleccionar fotos
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        {/* Photos Grid */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {photos.length === 0 ? 'Aún no hay fotos' : `Fotos compartidas (${photos.length})`}
          </h2>
          {photos.length === 0 && !isExpired && (
            <p className="text-gray-600">¡Sé el primero en compartir una foto!</p>
          )}
          {isExpired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800">Este evento ha expirado. No se pueden subir más fotos.</p>
            </div>
          )}
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PhotoCard({ photo }: { photo: Photo }) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadImage = async () => {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data } = supabase.storage.from('photos').getPublicUrl(photo.storage_path)
        setImageUrl(data.publicUrl)
      } catch (error) {
        console.error('Failed to load photo:', error)
      } finally {
        setLoading(false)
      }
    }
    loadImage()
  }, [photo.storage_path])

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden group">
      {loading ? (
        <div className="aspect-square bg-gray-200 animate-pulse flex items-center justify-center">
          <Camera className="h-12 w-12 text-gray-400" />
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={photo.caption || 'Foto del evento'}
          className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-200"
        />
      )}
      {photo.caption && (
        <div className="p-4">
          <p className="text-sm text-gray-600">{photo.caption}</p>
        </div>
      )}
    </div>
  )
}

export default EventPage
