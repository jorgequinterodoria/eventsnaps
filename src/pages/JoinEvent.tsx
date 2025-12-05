import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEventByCode } from '@/lib/database'
import Footer from '@/components/Footer'

const JoinEvent = () =>{
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoinEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (joinCode.trim().length !== 6) return

    setIsLoading(true)
    setError('')

    try {
      const event = await getEventByCode(joinCode.toUpperCase())
      if (event) {
        navigate(`/event/${joinCode.toUpperCase()}`)
      } else {
        setError('Evento no encontrado o expirado. Verifica el código e intenta nuevamente.')
      }
    } catch {
      setError('No se pudo unirse al evento. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-blue-500 rounded-full p-3">
            <Users className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Unirse al evento
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ingresa el código de 6 caracteres para unirte al evento de fotos
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleJoinEvent}>
            <div>
              <label htmlFor="event-code" className="block text-sm font-medium text-gray-700">
                Código del evento
              </label>
              <div className="mt-1">
                <input
                  id="event-code"
                  name="event-code"
                  type="text"
                  autoComplete="off"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ABC123"
                  maxLength={6}
                  minLength={6}
                  className={cn(
                    "appearance-none block w-full px-3 py-3 border border-gray-300 rounded-md",
                    "placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500",
                    "text-center text-lg font-mono tracking-widest uppercase",
                    error ? 'border-red-300' : ''
                  )}
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || joinCode.trim().length !== 6}
                className={cn(
                  "w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium",
                  "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                  "disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                )}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uniéndose...
                  </div>
                ) : (
                  'Unirse al evento'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              onClick={() => navigate('/')}
              className={cn(
                "w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium",
                "text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                "transition-colors duration-200"
              )}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default  JoinEvent
