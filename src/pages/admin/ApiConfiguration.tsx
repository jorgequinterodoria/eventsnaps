import { useTranslation } from 'react-i18next'
import { Settings, ShieldAlert, Save } from 'lucide-react'

interface ApiConfigurationProps {
  clientId: string
  setClientId: (val: string) => void
  clientSecret: string
  setClientSecret: (val: string) => void
  youtubeKey: string
  setYoutubeKey: (val: string) => void
  geminiKey: string
  setGeminiKey: (val: string) => void
  saveConfig: () => void
  retrying: boolean
}

export const ApiConfiguration = ({
  clientId, setClientId, clientSecret, setClientSecret,
  youtubeKey, setYoutubeKey, geminiKey, setGeminiKey,
  saveConfig, retrying
}: ApiConfigurationProps) => {
  const { t } = useTranslation()
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Settings className="h-5 w-5 mr-2 text-blue-600" />
        {t('admin.apiConfiguration')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div className="bg-green-50 p-5 rounded-lg border border-green-100">
          <h3 className="text-lg font-medium text-green-800 mb-4 flex items-center">{t('admin.spotify')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('admin.spotifyClientId')}</label>
              <input 
                type="text" 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('admin.spotifyClientSecret')}</label>
              <input 
                type="password" 
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

<div className="bg-red-50 p-5 rounded-lg border border-red-100">
          <h3 className="text-lg font-medium text-red-800 mb-4 flex items-center">{t('admin.youtube')}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('admin.youtubeApiKey')}</label>
            <input 
              type="text" 
              value={youtubeKey}
              onChange={(e) => setYoutubeKey(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
              placeholder="API Key de Google Cloud"
            />
          </div>
        </div>

        <div className="bg-purple-50 p-5 rounded-lg border border-purple-100">
          <h3 className="text-lg font-medium text-purple-800 mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            {t('admin.geminiTitle')}
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('admin.geminiApiKey')}</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              placeholder="AIza..."
            />
            <p className="mt-1 text-xs text-purple-600">
              Leída por la edge function <code>moderate-photo</code> en cada análisis.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-4 flex-wrap">
        <button
          onClick={saveConfig}
          className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Save className="h-4 w-4 mr-2" /> {t('common.save')}
        </button>
        {retrying && (
          <span className="text-sm text-purple-600 animate-pulse">{t('admin.reanalyzing')}</span>
        )}
      </div>
    </div>
  )
}
