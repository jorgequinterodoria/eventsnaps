import { useState, useEffect } from 'react'
import { insforge } from '@/lib/insforge'
import { useNavigate } from 'react-router-dom'
import { Activity } from 'lucide-react'


const AdminDashboard = () => {
  const navigate = useNavigate()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [youtubeKey, setYoutubeKey] = useState('')
  const [events, setEvents] = useState<any[]>([])
  
  useEffect(() => {
    if (!localStorage.getItem('admin_token')) {
      navigate('/admin')
    }
    loadConfig()
    loadEvents()
  }, [navigate])

  const loadConfig = async () => {
    const { data } = await insforge.database.from('admin_config').select('*')
    if (data) {
      data.forEach((item: any) => {
          if (item.key === 'spotify_client_id') setClientId(item.value)
          if (item.key === 'spotify_client_secret') setClientSecret(item.value)
          if (item.key === 'youtube_api_key') setYoutubeKey(item.value)
      })
    }
  }

  const loadEvents = async () => {
    const { data: eventsData } = await insforge.database.from('events').select(`
      *,
      jukebox_settings (*)
    `).order('created_at', { ascending: false })
    setEvents(eventsData || [])
  }

  const saveConfig = async () => {
    const { error } = await insforge.database.from('admin_config').upsert([
      { key: 'spotify_client_id', value: clientId },
      { key: 'spotify_client_secret', value: clientSecret },
      { key: 'youtube_api_key', value: youtubeKey }
    ])
    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      alert('Configuración guardada')
    }
  }

  const toggleJukebox = async (eventId: string, isActive: boolean, provider: 'spotify' | 'youtube' = 'spotify') => {
     // Check if settings exist
     const { data } = await insforge.database.from('jukebox_settings').select('*').eq('event_id', eventId).single()
     
     if (data) {
       await insforge.database.from('jukebox_settings').update({ is_active: !isActive, provider }).eq('event_id', eventId)
     } else {
       await insforge.database.from('jukebox_settings').insert({ event_id: eventId, is_active: true, provider })
     }
     loadEvents()
  }

  const changeProvider = async (eventId: string, provider: string) => {
      await insforge.database.from('jukebox_settings').update({ provider }).eq('event_id', eventId)
      loadEvents()
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Activity className="h-8 w-8 text-blue-600" />
                        <span className="ml-2 text-xl font-bold text-gray-900">Eventsnaps Admin</span>
                    </div>
                    <div className="flex items-center">
                        <button onClick={() => { localStorage.removeItem('admin_token'); navigate('/admin') }} className="text-gray-500 hover:text-gray-700">Logout</button>
                    </div>
                </div>
            </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Configuración de APIs</h2>
        <div className="grid grid-cols-1 gap-6 max-w-2xl">
          <div className="bg-green-50 p-4 rounded-md">
            <h3 className="text-lg font-medium text-green-800 mb-2">Spotify Credentials</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Client ID</label>
                    <input 
                    type="text" 
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Client Secret</label>
                    <input 
                    type="password" 
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">YouTube Data API</h3>
            <div>
                <label className="block text-sm font-medium text-gray-700">API Key</label>
                <input 
                type="text" 
                value={youtubeKey}
                onChange={(e) => setYoutubeKey(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="AIza..."
                />
            </div>
          </div>

          <div>
            <button
                onClick={saveConfig}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                Guardar Todas las Credenciales
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Gestión de Jukebox por Evento</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => {
                const isActive = event.jukebox_settings?.is_active
                const provider = event.jukebox_settings?.provider || 'spotify'
                
                return (
                  <tr key={event.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(event.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select 
                            value={provider} 
                            onChange={(e) => changeProvider(event.id, e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                            <option value="spotify">Spotify</option>
                            <option value="youtube">YouTube</option>
                        </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => toggleJukebox(event.id, !!isActive, provider)}
                        className={`text-sm ${isActive ? 'text-red-600 hover:text-red-900' : 'text-blue-600 hover:text-blue-900'} mr-4`}
                      >
                        {isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => window.open(`/event/${event.code}`, '_blank')}
                        className="text-sm text-green-600 hover:text-green-900"
                      >
                        Ver Lista
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  )
}

export default AdminDashboard
