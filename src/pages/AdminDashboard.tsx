import { useState, useEffect } from 'react'
import { insforge } from '@/lib/insforge'
import { useNavigate } from 'react-router-dom'
import { Activity, Users, Settings, LogOut, CheckCircle, XCircle, LayoutList, Save, ToggleLeft, ToggleRight, ShieldAlert, ChevronDown, ChevronRight, AlertTriangle, RefreshCcw } from 'lucide-react'
import { useAlert } from '@/contexts/AlertContext'
import type { Plan, PlanFeatures } from '@/lib/insforge'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const { showAlert } = useAlert()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [youtubeKey, setYoutubeKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [retrying, setRetrying] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [modLogs, setModLogs] = useState<any[]>([])
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAdminAndLoad()
  }, [navigate])

  const checkAdminAndLoad = async () => {
    try {
      const { data: sessionData } = await insforge.auth.getCurrentSession()
      if (!sessionData?.session) {
        navigate('/auth')
        return
      }
      
      const { data: profile } = await insforge.database
        .from('user_profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single()
        
      if (profile?.role !== 'admin') {
        navigate('/create')
        return
      }

      await loadConfig()
      await loadEvents()
      await loadUsers()
      await loadPlans()
      await loadModLogs()
    } catch (err) {
      console.error(err)
      navigate('/')
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsers = async () => {
    const { data: usersData } = await insforge.database
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(usersData || [])
  }

  const loadPlans = async () => {
    const { data } = await insforge.database
      .from('plans')
      .select('*')
      .order('price', { ascending: true })
    setPlans((data as Plan[]) || [])
  }

  const loadModLogs = async () => {
    setLoadingLogs(true)
    try {
      // Fetch all moderation queue entries, joined with photos and events
      const { data: queueRows } = await insforge.database
        .from('moderation_queues')
        .select(`
          id,
          photo_id,
          queued_at,
          gemini_suggestion,
          confidence_score,
          processed,
          error_message,
          photos (
            id,
            status,
            storage_path,
            caption,
            event_id,
            events ( id, code, creator_id )
          )
        `)
        .order('queued_at', { ascending: false })
        .limit(200)

      if (!queueRows) return

      // Group by event
      const byEvent: Record<string, { event: any; rows: any[] }> = {}
      for (const row of queueRows as any[]) {
        const event = row.photos?.events
        if (!event) continue
        if (!byEvent[event.id]) byEvent[event.id] = { event, rows: [] }
        byEvent[event.id].rows.push(row)
      }
      setModLogs(Object.values(byEvent))
    } finally {
      setLoadingLogs(false)
    }
  }

  const toggleEventExpand = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      next.has(eventId) ? next.delete(eventId) : next.add(eventId)
      return next
    })
  }

  const togglePlanFeature = (planId: string, feature: keyof PlanFeatures) => {
    setPlans(prev => prev.map(p =>
      p.id !== planId ? p : {
        ...p,
        features: { ...p.features, [feature]: !p.features[feature] }
      }
    ))
  }

  const savePlan = async (plan: Plan) => {
    const { error } = await insforge.database
      .from('plans')
      .update({ features: plan.features, name: plan.name, price: plan.price })
      .eq('id', plan.id)
    if (error) {
      showAlert('Error al guardar: ' + error.message, 'Error')
    } else {
      showAlert(`Plan "${plan.name}" guardado correctamente`)
    }
  }

  const loadConfig = async () => {
    const { data } = await insforge.database.from('admin_config').select('*')
    if (data) {
      data.forEach((item: any) => {
          if (item.key === 'spotify_client_id') setClientId(item.value)
          if (item.key === 'spotify_client_secret') setClientSecret(item.value)
          if (item.key === 'youtube_api_key') setYoutubeKey(item.value)
          if (item.key === 'gemini_api_key') setGeminiKey(item.value)
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
      { key: 'youtube_api_key', value: youtubeKey },
      { key: 'gemini_api_key', value: geminiKey }
    ])
    if (error) {
      showAlert('Error al guardar: ' + error.message, 'Error')
    } else {
      showAlert('Configuración guardada')
    }
  }

  const retryGeminiErrors = async () => {
    setRetrying(true)
    try {
      // Fetch all unprocessed queue items that had Gemini errors (no suggestion or confidence=0)
      const { data: failedRows } = await insforge.database
        .from('moderation_queues')
        .select('id, photo_id, photos ( storage_path )')
        .eq('processed', false)
        .is('gemini_suggestion', null)

      if (!failedRows || (failedRows as any[]).length === 0) {
        showAlert('No hay fotos con error de Gemini pendientes.')
        setRetrying(false)
        return
      }

      const insforgeUrl = import.meta.env.VITE_INSFORGE_URL
      const anonKey    = import.meta.env.VITE_INSFORGE_ANON_KEY
      let successes = 0

      for (const row of failedRows as any[]) {
        const storagePath = row.photos?.storage_path
        if (!storagePath) continue
        try {
          const { data, error } = await insforge.functions.invoke('moderate-photo', {
            body: { storagePath, insforgeUrl, anonKey }
          })
          
          if (error) {
            await insforge.database
              .from('moderation_queues')
              .update({ error_message: `Error de red: ${error.message}` })
              .eq('id', row.id)
            continue
          }
          
          const analysis = data as any
          
          // If the edge function explicitly returned an errorMessage (e.g. no API key configured)
          // or if suggestion is null
          if (!analysis || !analysis.suggestion || analysis.confidence === 0 || analysis.errorMessage) {
            if (analysis && analysis.errorMessage) {
              await insforge.database
                .from('moderation_queues')
                .update({ error_message: analysis.errorMessage })
                .eq('id', row.id)
            }
            continue
          }

          // Persist successful suggestion
          await insforge.database
            .from('moderation_queues')
            .update({ 
               gemini_suggestion: analysis.suggestion, 
               confidence_score: analysis.confidence,
               error_message: null
            })
            .eq('id', row.id)

          // Auto-act on high confidence
          const AUTO_THRESHOLD = 0.9
          if (analysis.suggestion === 'reject' || (analysis.suggestion === 'approve' && analysis.confidence >= AUTO_THRESHOLD)) {
            await insforge.database
              .from('photos')
              .update({ status: analysis.suggestion === 'approve' ? 'approved' : 'rejected' })
              .eq('id', row.photo_id)
            await insforge.database
              .from('moderation_queues')
              .update({ processed: true })
              .eq('id', row.id)
            await insforge.database
              .from('moderation_actions')
              .insert({
                photo_id: row.photo_id,
                moderator_id: 'gemini-retry',
                action: analysis.suggestion,
                reason: `IA Gemini reintento (confianza: ${Math.round(analysis.confidence * 100)}%)`
              })
          }
          successes++
        } catch { /* continue */ }
      }
      await loadModLogs()
      showAlert(`Reintento completado: ${successes} de ${(failedRows as any[]).length} fotos re-analizadas correctamente.`)
    } catch (err: any) {
      showAlert(err?.message || 'Error en el reintento', 'Error')
    } finally {
      setRetrying(false)
    }
  }

  const toggleJukebox = async (eventId: string, isActive: boolean, provider: 'spotify' | 'youtube' = 'spotify') => {
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

  const updateUserPlan = async (userId: string, plan_id: string) => {
      await insforge.database.from('user_profiles').update({ plan_id }).eq('id', userId)
      loadUsers()
  }

  const updateUserStatus = async (userId: string, status: string) => {
      await insforge.database.from('user_profiles').update({ status }).eq('id', userId)
      loadUsers()
  }

  const handleLogout = async () => {
    await insforge.auth.signOut()
    window.location.href = '/'
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando dashboard...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Activity className="h-8 w-8 text-blue-600" />
                        <span className="ml-2 text-xl font-bold text-gray-900">Admin Dashboard</span>
                    </div>
                    <div className="flex items-center">
                        <button onClick={handleLogout} className="flex items-center text-gray-500 hover:text-gray-700">
                          <LogOut className="h-4 w-4 mr-2" />
                          Salir
                        </button>
                    </div>
                </div>
            </div>
        </nav>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* USERS MANAGEMENT SECTION */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Gestión de Usuarios (SaaS)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        <div className="text-xs text-gray-500">Rol: {user.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select 
                          value={user.plan_id}
                          onChange={(e) => updateUserPlan(user.id, e.target.value)}
                          className="mt-1 block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                          <option value="basic">Básico</option>
                          <option value="pro">Pro</option>
                          <option value="trial_pro">Trial Pro</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select 
                          value={user.status}
                          onChange={(e) => updateUserStatus(user.id, e.target.value)}
                          className={`mt-1 block w-full pl-3 pr-8 py-2 text-sm focus:outline-none rounded-md ${
                            user.status === 'active' ? 'text-green-700 bg-green-50 border-green-200 focus:ring-green-500 focus:border-green-500' 
                            : 'text-red-700 bg-red-50 border-red-200 focus:ring-red-500 focus:border-red-500'
                          }`}
                        >
                          <option value="active">Activo</option>
                          <option value="disabled">Deshabilitado</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* EVENTS MANAGEMENT SECTION */}
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
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            >
                                <option value="spotify">Spotify</option>
                                <option value="youtube">YouTube</option>
                            </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-4">
                          <button 
                            onClick={() => toggleJukebox(event.id, !!isActive, provider)}
                            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={isActive ? 'Desactivar' : 'Activar'}
                          >
                            {isActive ? <XCircle size={20} /> : <CheckCircle size={20} />}
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

          {/* PLANS MANAGEMENT SECTION */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <LayoutList className="h-5 w-5 mr-2 text-blue-600" />
              Gestión de Planes (Features)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const boolFeatures = (['gallery','playlist','tv_mode','white_label'] as (keyof PlanFeatures)[])
                return (
                  <div key={plan.id} className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">{plan.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">{plan.id}</p>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">
                        {plan.price === 0 ? 'Gratis' : `$${plan.price.toLocaleString('es-CO')}`}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {boolFeatures.map((feat) => {
                        const enabled = !!(plan.features as any)?.[feat]
                        return (
                          <div key={feat} className="flex items-center justify-between">
                            <span className="text-sm text-gray-700 capitalize">{feat.replace('_',' ')}</span>
                            <button
                              onClick={() => togglePlanFeature(plan.id, feat)}
                              title={enabled ? 'Desactivar' : 'Activar'}
                              className={`transition-colors ${enabled ? 'text-blue-600' : 'text-gray-300'}`}
                            >
                              {enabled
                                ? <ToggleRight className="h-7 w-7" />
                                : <ToggleLeft className="h-7 w-7" />}
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => savePlan(plan)}
                      className="mt-auto flex items-center justify-center gap-1.5 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Save className="h-4 w-4" /> Guardar cambios
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* MODERATION LOGS SECTION */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <ShieldAlert className="h-5 w-5 mr-2 text-blue-600" />
                Logs de Moderación de Fotos
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={retryGeminiErrors}
                  disabled={retrying}
                  className="flex items-center gap-1.5 text-sm text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {retrying ? 'Re-analizando...' : 'Re-analizar errores Gemini'}
                </button>
                <button
                  onClick={loadModLogs}
                  disabled={loadingLogs}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 font-medium transition-colors"
                >
                  <RefreshCcw className={`h-4 w-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                  {loadingLogs ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </div>

            {modLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No hay registros de moderación aún.</p>
            ) : (
              <div className="space-y-3">
                {modLogs.map(({ event, rows }) => {
                  const pending  = rows.filter((r: any) => !r.processed).length
                  const approved = rows.filter((r: any) => r.processed && r.photos?.status === 'approved').length
                  const rejected = rows.filter((r: any) => r.processed && r.photos?.status === 'rejected').length
                  const geminiErrors = rows.filter((r: any) =>
                    !r.processed && (!r.gemini_suggestion || r.confidence_score === 0)
                  ).length
                  const isOpen = expandedEvents.has(event.id)

                  return (
                    <div key={event.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Event header row */}
                      <button
                        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        onClick={() => toggleEventExpand(event.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                          <span className="font-bold text-gray-900 font-mono tracking-wider">{event.code}</span>
                          <span className="text-xs text-gray-500">{rows.length} fotos en cola</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium">
                          {geminiErrors > 0 && (
                            <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                              <AlertTriangle className="h-3 w-3" />
                              {geminiErrors} error{geminiErrors > 1 ? 'es' : ''} Gemini
                            </span>
                          )}
                          <span className="text-amber-700 bg-amber-50 px-2 py-1 rounded-full">{pending} pendientes</span>
                          <span className="text-green-700 bg-green-50 px-2 py-1 rounded-full">{approved} aprobadas</span>
                          <span className="text-red-700 bg-red-50 px-2 py-1 rounded-full">{rejected} rechazadas</span>
                        </div>
                      </button>

                      {/* Photo rows */}
                      {isOpen && (
                        <div className="divide-y divide-gray-100">
                          <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-white">
                            <span className="col-span-4">Foto / Caption</span>
                            <span className="col-span-2">Estado</span>
                            <span className="col-span-2">IA Gemini</span>
                            <span className="col-span-2">Confianza</span>
                            <span className="col-span-2">En cola desde</span>
                          </div>
                          {rows.map((row: any) => {
                            const isGeminiError = !row.gemini_suggestion || row.confidence_score === 0
                            const conf = row.confidence_score ? Math.round(row.confidence_score * 100) : null
                            const status = row.photos?.status ?? 'pending'

                            return (
                              <div key={row.id} className={`grid grid-cols-12 gap-2 px-5 py-3 text-sm items-center ${isGeminiError && !row.processed ? 'bg-red-50' : 'bg-white'}`}>
                                {/* Caption */}
                                <div className="col-span-4 truncate text-gray-700">
                                  {row.photos?.caption || <span className="text-gray-400 italic">Sin pie de foto</span>}
                                  {isGeminiError && !row.processed && (
                                    <span 
                                      className="ml-2 inline-flex items-center gap-1 text-xs text-red-600 font-medium truncate max-w-[200px]" 
                                      title={row.error_message || 'Error API Gemini'}
                                    >
                                      <AlertTriangle className="h-3 w-3 flex-shrink-0" /> 
                                      {row.error_message || 'Error API Gemini'}
                                    </span>
                                  )}
                                </div>

                                {/* Photo status */}
                                <div className="col-span-2">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                                    ${status === 'approved' ? 'bg-green-100 text-green-700'
                                    : status === 'rejected' ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'}`}>
                                    {status === 'approved' ? 'Aprobada' : status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                                  </span>
                                </div>

                                {/* Gemini suggestion */}
                                <div className="col-span-2">
                                  {row.gemini_suggestion ? (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                                      ${row.gemini_suggestion === 'approve' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {row.gemini_suggestion === 'approve' ? '✅ aprobar' : '❌ rechazar'}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">Sin análisis</span>
                                  )}
                                </div>

                                {/* Confidence */}
                                <div className="col-span-2">
                                  {conf !== null ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${conf >= 80 ? 'bg-green-500' : conf >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                          style={{ width: `${conf}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-600 w-8 text-right">{conf}%</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </div>

                                {/* Queued at */}
                                <div className="col-span-2 text-xs text-gray-500">
                                  {new Date(row.queued_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* API CONFIGURATION SECTION */}

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-blue-600" />
              Configuración de APIs Integradas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
              <div className="bg-green-50 p-5 rounded-lg border border-green-100">
                <h3 className="text-lg font-medium text-green-800 mb-4 flex items-center">Spotify API</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Client ID</label>
                        <input 
                          type="text" 
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Client Secret</label>
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
                <h3 className="text-lg font-medium text-red-800 mb-4 flex items-center">YouTube Data API</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700">API Key</label>
                    <input 
                      type="text" 
                      value={youtubeKey}
                      onChange={(e) => setYoutubeKey(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      placeholder="API Key de Google Cloud"
                    />
                </div>
              </div>

              {/* Gemini API */}
              <div className="bg-purple-50 p-5 rounded-lg border border-purple-100">
                <h3 className="text-lg font-medium text-purple-800 mb-4 flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Google Gemini API (Moderación)
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
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
                  <Save className="h-4 w-4 mr-2" /> Guardar Configuración de APIs
              </button>
              {retrying && (
                <span className="text-sm text-purple-600 animate-pulse">Re-analizando fotos...</span>
              )}
            </div>
          </div>


        </div>
    </div>
  )
}

export default AdminDashboard
