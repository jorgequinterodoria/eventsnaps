import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, X } from 'lucide-react'
import { insforge } from '../../lib/insforge'
import { useAlert } from '../../contexts/AlertContext'
import { cn } from '../../lib/utils'
import type { LandingConfig } from '../../lib/insforge'

interface LandingEditorProps {
  eventId: string
  config: LandingConfig
  onSaved: (config: LandingConfig) => void
  onClose: () => void
}

export default function LandingEditor({ eventId, config, onSaved, onClose }: LandingEditorProps) {
  const { t } = useTranslation()
  const { showAlert } = useAlert()
  const [coverUrl, setCoverUrl] = useState(config.cover_url || '')
  const [headline, setHeadline] = useState(config.headline || '')
  const [subheadline, setSubheadline] = useState(config.subheadline || '')
  const [showGallery, setShowGallery] = useState(config.show_gallery_button !== false)
  const [showJukebox, setShowJukebox] = useState(config.show_jukebox_button !== false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const newConfig: LandingConfig = {
        cover_url: coverUrl || undefined,
        headline: headline || undefined,
        subheadline: subheadline || undefined,
        show_gallery_button: showGallery,
        show_jukebox_button: showJukebox,
      }
      const { error } = await insforge.database
        .from('events')
        .update({ landing_config: newConfig })
        .eq('id', eventId)
      if (error) throw error
      onSaved(newConfig)
      showAlert(t('common.saved'), '')
    } catch {
      showAlert(t('common.error'), '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('landing.edit')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('landing.coverUrl')}</label>
            <input
              type="text"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            {coverUrl && (
              <img src={coverUrl} alt="" className="mt-2 w-full h-32 object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('landing.headline')}</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={t('event.welcomeTo', { code: '' }).replace(' ', '')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('landing.subheadline')}</label>
            <input
              type="text"
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('landing.showGallery')}</label>
            <button
              type="button"
              onClick={() => setShowGallery(!showGallery)}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                showGallery ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition", showGallery ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('landing.showJukebox')}</label>
            <button
              type="button"
              onClick={() => setShowJukebox(!showJukebox)}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                showJukebox ? 'bg-blue-600' : 'bg-gray-300'
              )}
            >
              <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition", showJukebox ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 flex items-center justify-center"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('landing.saveConfig')}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
