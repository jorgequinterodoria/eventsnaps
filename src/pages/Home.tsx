import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Users, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const Home = () => {
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')

  const handleJoinEvent = (e: React.FormEvent) => {
    e.preventDefault()
    if (joinCode.trim().length === 6) {
      navigate(`/event/${joinCode.toUpperCase()}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-transparent sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="text-center">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">EventSnaps</span>
                  <span className="block text-blue-600">Comparte tus momentos</span>
                </h1>
                <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                  Crea espacios privados para compartir fotos de tus eventos. Comparte recuerdos con amigos y familiares utilizando un sencillo código de 6 dígitos.
                </p>
                
                {/* Features */}
                <div className="mt-10">
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="pt-6">
                      <div className="flow-root bg-white rounded-lg px-6 pb-8">
                        <div className="-mt-6">
                          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                            <Camera className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Carga fácil</h3>
                          <p className="mt-5 text-base text-gray-500">
                            Arrastra y suelta o selecciona fotos para compartirlas al instante.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6">
                      <div className="flow-root bg-white rounded-lg px-6 pb-8">
                        <div className="-mt-6">
                          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Compartir en privado</h3>
                          <p className="mt-5 text-base text-gray-500">
                            Solo las personas con tu código de evento pueden ver las fotos.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6">
                      <div className="flow-root bg-white rounded-lg px-6 pb-8">
                        <div className="-mt-6">
                          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                            <Clock className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Tiempo limitado</h3>
                          <p className="mt-5 text-base text-gray-500">
                            Los eventos duran entre 24 y 72 horas, perfectos para reuniones temporales.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-6">
                      <div className="flow-root bg-white rounded-lg px-6 pb-8">
                        <div className="-mt-6">
                          <div className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                            <Zap className="h-6 w-6 text-white" />
                          </div>
                          <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Moderación con IA</h3>
                          <p className="mt-5 text-base text-gray-500">
                            Moderación de contenido opcional basada en IA para tus eventos
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Action Section */}
      <div className="bg-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              ¿Listo para empezar a compartir?
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Crea un nuevo evento o únete a uno ya existente.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {/* Create Event */}
            <div className="bg-gray-50 rounded-lg px-6 py-8">
              <h3 className="text-2xl font-bold text-gray-900">Crear Nuevo Evento</h3>
              <p className="mt-4 text-gray-600">
                Crea un nuevo espacio para compartir fotos de tu evento. Elige la duración y las opciones de moderación.
              </p>
              <button
                onClick={() => navigate('/create')}
                className={cn(
                  "mt-6 w-full inline-flex items-center justify-center px-6 py-3",
                  "border border-transparent text-base font-medium rounded-md",
                  "text-white bg-blue-600 hover:bg-blue-700",
                  "transition-colors duration-200"
                )}
              >
                Crear Evento
              </button>
            </div>

            {/* Join Event */}
            <div className="bg-gray-50 rounded-lg px-6 py-8">
              <h3 className="text-2xl font-bold text-gray-900">Únete al evento</h3>
              <p className="mt-4 text-gray-600">
                Introduce el código de 6 dígitos compartido por el creador del evento para ver y subir fotos.
              </p>
              <form onSubmit={handleJoinEvent} className="mt-6">
                <div>
                  <label htmlFor="event-code" className="sr-only">
                    Código del Evento
                  </label>
                  <input
                    type="text"
                    id="event-code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Introduzca el código de 6 dígitos."
                    maxLength={6}
                    minLength={6}
                    required
                    className={cn(
                      "block w-full px-4 py-3 border border-gray-300 rounded-md",
                      "placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500",
                      "text-center text-lg font-mono tracking-wider"
                    )}
                  />
                </div>
                <button
                  type="submit"
                  disabled={joinCode.trim().length !== 6}
                  className={cn(
                    "mt-4 w-full inline-flex items-center justify-center px-6 py-3",
                    "border border-transparent text-base font-medium rounded-md",
                    "text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400",
                    "transition-colors duration-200"
                  )}
                >
                  Unirse al Evento
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home