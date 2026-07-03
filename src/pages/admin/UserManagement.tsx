import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { UserProfile } from '../../types/admin'

interface UserManagementProps {
  users: UserProfile[]
  updateUserPlan: (userId: string, planId: string) => void
  updateUserStatus: (userId: string, status: string) => void
}

export const UserManagement = ({ users, updateUserPlan, updateUserStatus }: UserManagementProps) => {
  const { t } = useTranslation()
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Users className="h-5 w-5 mr-2 text-blue-600" />
        {t('admin.userManagement')}
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
                  <div className="text-xs text-gray-500">{t('admin.role')}: {user.role}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select 
                    value={user.plan_id}
                    onChange={(e) => updateUserPlan(user.id, e.target.value)}
                    className="mt-1 block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  >
                    <option value="basic">{t('admin.planBasic')}</option>
                    <option value="pro">{t('admin.planPro')}</option>
                    <option value="trial_pro">{t('admin.planTrialPro')}</option>
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
                    <option value="active">{t('admin.active')}</option>
                    <option value="disabled">{t('admin.disabled')}</option>
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
  )
}
