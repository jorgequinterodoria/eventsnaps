import { useState, useEffect } from 'react'
import { insforge } from '@/lib/insforge'
import { useNavigate } from 'react-router-dom'
import { User, Instagram, Save, ChevronLeft, CalendarDays, ExternalLink, Trash2, Image as ImageIcon, Crown } from 'lucide-react'
import { useAlert } from '@/contexts/AlertContext'
import { resolveUserFeatures } from '@/lib/subscription'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { showAlert, showConfirm } = useAlert()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  
  const [fullName, setFullName] = useState('')
  const [instagram, setInstagram] = useState('')
  const [customLogoUrl, setCustomLogoUrl] = useState('')
  const [whiteLabelAllowed, setWhiteLabelAllowed] = useState(false)
  const [userEvents, setUserEvents] = useState<any[]>([])

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: sessionData } = await insforge.auth.getCurrentSession()
      if (!sessionData?.session) {
        navigate('/auth')
        return
      }

      const { data } = await insforge.database
        .from('user_profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single()
      
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setInstagram(data.instagram_username || '')
        setCustomLogoUrl(data.custom_logo_url || '')
        // Check if user has white_label feature
        const features = await resolveUserFeatures(sessionData.session.user.id)
        setWhiteLabelAllowed(features.white_label)
      }

      // Load user events
      const { data: eventsData } = await insforge.database
        .from('events')
        .select('*')
        .eq('creator_id', sessionData.session.user.id)
        .order('created_at', { ascending: false })
      
      if (eventsData) {
        setUserEvents(eventsData)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (!profile) return
      const { error } = await insforge.database
        .from('user_profiles')
        .update({
          full_name: fullName,
          instagram_username: instagram.replace('@', ''),
          custom_logo_url: customLogoUrl.trim() || null
        })
        .eq('id', profile.id)
        
      if (error) throw error
      showAlert('Perfil guardado exitosamente')
    } catch (err: any) {
         console.error(err)
      showAlert(err.message || 'Error guardando perfil', 'Error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEvent = async (eventId: string, eventCode: string) => {
    const confirmed = await showConfirm(`¿Estás seguro que deseas eliminar el evento ${eventCode}? Esta acción no se puede deshacer.`)
    if (!confirmed) return

    try {
      const { error } = await insforge.database
        .from('events')
        .delete()
        .eq('id', eventId)
      
      if (error) throw error
      
      setUserEvents(prev => prev.filter(e => e.id !== eventId))
      showAlert('Evento eliminado correctamente')
    } catch (err: any) {
      console.error(err)
      showAlert(err.message || 'Error al eliminar el evento', 'Error')
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando perfil...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
        <div className="flex items-center mb-6">
           <button onClick={() => navigate('/')} className="mr-3 text-gray-500 hover:text-gray-900">
               <ChevronLeft className="h-6 w-6" />
           </button>
           <h2 className="text-2xl font-bold text-gray-900 flex items-center">
             <User className="mr-2 text-blue-600 h-6 w-6" />
             Mi Perfil
           </h2>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Completo (o Apodo)</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-3 sm:text-sm border-gray-300 rounded-md py-2 border outline-none"
                placeholder="Ej. Jorge Quintero"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Este nombre se mostrará en las playlists de tus eventos.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Usuario de Instagram</label>
            <div className="mt-1 relative rounded-md shadow-sm flex items-center">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm h-full py-2">
                <Instagram className="h-4 w-4 mr-1"/> @
              </span>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="focus:ring-blue-500 focus:border-blue-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300 py-2 border outline-none px-3"
                placeholder="usuario"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Las personas podrán visitar tu Instagram desde la playlist.</p>
          </div>

          {/* White-label Logo (Pro only) */}
          {whiteLabelAllowed && (
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                <Crown className="h-4 w-4 text-amber-500" />
                Logo personalizado (White Label)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="url"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-3 sm:text-sm border-gray-300 rounded-md py-2 border outline-none"
                  placeholder="https://mi-dominio.com/mi-logo.png"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Este logo reemplazará el branding de EventSnaps en tus eventos.
              </p>
              {/* Live preview */}
              {customLogoUrl && (
                <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <ImageIcon className="h-5 w-5 text-gray-400 shrink-0" />
                  <img
                    src={customLogoUrl}
                    alt="Vista previa del logo"
                    className="h-10 w-auto max-w-[160px] object-contain rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block' }}
                  />
                  <span className="text-xs text-gray-500">Vista previa</span>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-gray-200 text-sm text-gray-500 space-y-1">
             <p><strong>Email:</strong> {profile?.email}</p>
             <p><strong>Plan:</strong> <span className="uppercase font-semibold text-blue-600">{profile?.plan_id}</span></p>
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
            >
              {saving ? 'Guardando...' : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Guardar Perfil
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="max-w-md mx-auto mt-8 bg-white rounded-xl shadow-md overflow-hidden p-8">
        <h2 className="text-xl font-bold text-gray-900 flex items-center mb-6">
           <CalendarDays className="mr-2 text-blue-600 h-6 w-6" />
           Mis Eventos
        </h2>

        {userEvents.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No has creado ningún evento aún.</p>
        ) : (
          <div className="space-y-4">
            {userEvents.map(event => {
              const isActive = new Date(event.expires_at) > new Date()
              return (
                <div key={event.id} className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{event.code}</h3>
                      <p className="text-xs text-gray-500">
                        Creado: {new Date(event.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isActive ? 'Activo' : 'Expirado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => navigate(`/event/${event.code}`)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-1"/> Ir al evento
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id, event.code)}
                      className="text-sm font-medium text-red-600 hover:text-red-800 flex items-center p-2 rounded-md hover:bg-red-50"
                      title="Eliminar evento"
                    >
                      <Trash2 className="h-4 w-4"/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
