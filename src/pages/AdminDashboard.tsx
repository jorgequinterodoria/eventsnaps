import { useState, useEffect, useCallback } from 'react'
import { insforge } from '../lib/insforge'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Activity, LogOut } from 'lucide-react'
import { ROUTES } from '../constants/routes'

import { useAdminUsers } from '../hooks/useAdminUsers'
import { useAdminEvents } from '../hooks/useAdminEvents'
import { useAdminPlans } from '../hooks/useAdminPlans'
import { useAdminModeration } from '../hooks/useAdminModeration'
import { useAdminConfig } from '../hooks/useAdminConfig'

import { UserManagement } from './admin/UserManagement'
import { EventManagement } from './admin/EventManagement'
import { PlanManagement } from './admin/PlanManagement'
import { ModerationLogs } from './admin/ModerationLogs'
import { ApiConfiguration } from './admin/ApiConfiguration'

const AdminDashboard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)

  const { users, loadUsers, updateUserPlan, updateUserStatus } = useAdminUsers()
  const { events, loadEvents, toggleJukebox, changeProvider } = useAdminEvents()
  const { plans, loadPlans, togglePlanFeature, savePlan } = useAdminPlans()
  const { modLogs, loadingLogs, retrying, expandedEvents, loadModLogs, toggleEventExpand, retryGeminiErrors } = useAdminModeration()
  const {
    clientId, setClientId, clientSecret, setClientSecret,
    youtubeKey, setYoutubeKey,
    // geminiKey, setGeminiKey,  // AI disabled
    loadConfig, saveConfig
  } = useAdminConfig()

  const checkAdminAndLoad = useCallback(async () => {
    try {
      const { data: sessionData } = await insforge.auth.getCurrentUser()
      if (!sessionData?.user) {
        navigate(ROUTES.AUTH)
        return
      }
      
      const { data: profile } = await insforge.database
        .from('user_profiles')
        .select('*')
        .eq('id', sessionData.user.id)
        .single()
        
      if (profile?.role !== 'admin') {
        navigate(ROUTES.CREATE_EVENT)
        return
      }

      await loadConfig()
      await loadEvents()
      await loadUsers()
      await loadPlans()
      await loadModLogs()
    } catch {
      navigate(ROUTES.HOME)
    } finally {
      setIsLoading(false)
    }
  }, [navigate, loadConfig, loadEvents, loadUsers, loadPlans, loadModLogs])

  useEffect(() => {
    checkAdminAndLoad()
  }, [checkAdminAndLoad])

  const handleLogout = async () => {
    await insforge.auth.signOut()
    window.location.href = ROUTES.HOME
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">{t('common.loading')}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">{t('admin.dashboard')}</span>
            </div>
            <div className="flex items-center">
              <button onClick={handleLogout} className="flex items-center text-gray-500 hover:text-gray-700">
                <LogOut className="h-4 w-4 mr-2" />
                {t('admin.logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <UserManagement 
          users={users} 
          updateUserPlan={updateUserPlan} 
          updateUserStatus={updateUserStatus} 
        />
        
        <EventManagement 
          events={events} 
          changeProvider={changeProvider} 
          toggleJukebox={toggleJukebox} 
        />
        
        <PlanManagement 
          plans={plans} 
          togglePlanFeature={togglePlanFeature} 
          savePlan={savePlan} 
        />
        
        <ModerationLogs 
          modLogs={modLogs}
          loadingLogs={loadingLogs}
          retrying={retrying}
          expandedEvents={expandedEvents}
          loadModLogs={loadModLogs}
          retryGeminiErrors={retryGeminiErrors}
          toggleEventExpand={toggleEventExpand}
        />
        
        <ApiConfiguration 
          clientId={clientId} setClientId={setClientId}
          clientSecret={clientSecret} setClientSecret={setClientSecret}
          youtubeKey={youtubeKey} setYoutubeKey={setYoutubeKey}
          // geminiKey={geminiKey} setGeminiKey={setGeminiKey}  // AI disabled
          saveConfig={saveConfig}
          retrying={retrying}
        />
      </div>
    </div>
  )
}

export default AdminDashboard
