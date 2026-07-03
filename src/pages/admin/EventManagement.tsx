import { useTranslation } from 'react-i18next'
import { CheckCircle, XCircle } from 'lucide-react'
import { AdminEvent } from '../../types/admin'
import { APP_CONFIG } from '../../constants/config'

interface EventManagementProps {
  events: AdminEvent[]
  changeProvider: (eventId: string, provider: string) => void
  toggleJukebox: (eventId: string, isActive: boolean, provider: 'spotify' | 'youtube') => void
}

export const EventManagement = ({ events, changeProvider, toggleJukebox }: EventManagementProps) => {
  const { t } = useTranslation()
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">{t('admin.eventManagement')}</h2>
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
                      {isActive ? t('admin.active') : t('admin.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <select 
                          value={provider} 
                          onChange={(e) => changeProvider(event.id, e.target.value)}
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                          <option value="spotify">{t('admin.spotify')}</option>
                          <option value="youtube">{t('admin.youtube')}</option>
                      </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-4">
                    <button 
                      onClick={() => toggleJukebox(event.id, !!isActive, provider as 'spotify' | 'youtube')}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                      title={isActive ? t('admin.disable') : t('admin.enable')}
                    >
                      {isActive ? <XCircle size={APP_CONFIG.UI.ICON_SIZE_MEDIUM} /> : <CheckCircle size={APP_CONFIG.UI.ICON_SIZE_MEDIUM} />}
                    </button>
                    <button
                      onClick={() => window.open(`/event/${event.code}`, '_blank')}
                      className="text-sm text-blue-600 hover:text-blue-900"
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
  )
}
