import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Shield, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createEvent } from '@/lib/database'
import QRCode from '@/components/QRCode'
import Footer from '@/components/Footer'

const CreateEvent = () =>{
  const navigate = useNavigate()
  const [duration, setDuration] = useState<'24h' | '72h'>('24h')
  const [moderationEnabled, setModerationEnabled] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [createdCode, setCreatedCode] = useState<string>('')

  const handleCreateEvent = async () => {
    setIsCreating(true)
    try {
      const event = await createEvent(duration, moderationEnabled)
      setCreatedCode(event.code)
      setShowQR(true)
    } catch (error) {
      console.error('Error al crear el evento:', error)
      alert('No se pudo crear el evento. Intenta nuevamente.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Crear nuevo evento</h2>
          <p className="mt-2 text-sm text-gray-600">
            Configura tu espacio para compartir fotos
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10">
          {/* Duration Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Duración del evento
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setDuration('24h')}
                className={cn(
                  "relative rounded-lg border-2 p-4 flex flex-col items-center justify-center",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  duration === '24h' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-white hover:border-gray-400'
                )}
              >
                <Clock className="h-6 w-6 mb-2 text-blue-600" />
                <span className="text-sm font-medium">24 horas</span>
                <span className="text-xs text-gray-500 mt-1">Perfecto para fiestas</span>
              </button>
              
              <button
                type="button"
                onClick={() => setDuration('72h')}
                className={cn(
                  "relative rounded-lg border-2 p-4 flex flex-col items-center justify-center",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500",
                  duration === '72h' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 bg-white hover:border-gray-400'
                )}
              >
                <Clock className="h-6 w-6 mb-2 text-blue-600" />
                <span className="text-sm font-medium">72 horas</span>
                <span className="text-xs text-gray-500 mt-1">Ideal para bodas</span>
              </button>
            </div>
          </div>

          {/* Moderation Toggle */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <label className="text-sm font-medium text-gray-700">
                  Moderación de contenido con IA
                </label>
              </div>
              <button
                type="button"
                onClick={() => setModerationEnabled(!moderationEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  moderationEnabled ? 'bg-blue-600' : 'bg-gray-200'
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    moderationEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Cuando está activada, las fotos subidas serán revisadas por IA antes de mostrarse.
            </p>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateEvent}
            disabled={isCreating}
            className={cn(
              "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium",
              "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              "disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            )}
          >
            {isCreating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creando...
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Crear evento
              </div>
            )}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Volver al inicio
          </button>
        </div>

        {showQR && (
          <div className="mt-8 bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Comparte este código QR</h3>
              <p className="mt-1 text-sm text-gray-600">Escanéalo para abrir el evento</p>
            </div>
            <div className="flex items-center justify-center">
              <QRCode url={`https://tusfotosevento.netlify.app/event/${createdCode}`} size={256} caption={`Código: ${createdCode}`} />
            </div>
            <div className="mt-3 text-center">
              <a
                href={`https://tusfotosevento.netlify.app/event/${createdCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                https://tusfotosevento.netlify.app/event/{createdCode}
              </a>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => navigate(`/event/${createdCode}`)}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                Ir al evento
              </button>
              <button
                onClick={() => setShowQR(false)}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default CreateEvent
