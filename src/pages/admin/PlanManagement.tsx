import { useTranslation } from 'react-i18next'
import { LayoutList, ToggleRight, ToggleLeft, Save } from 'lucide-react'
import type { Plan, PlanFeatures } from '../../lib/insforge'

interface PlanManagementProps {
  plans: Plan[]
  togglePlanFeature: (planId: string, feature: keyof PlanFeatures) => void
  savePlan: (plan: Plan) => void
}

export const PlanManagement = ({ plans, togglePlanFeature, savePlan }: PlanManagementProps) => {
  const { t } = useTranslation()
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <LayoutList className="h-5 w-5 mr-2 text-blue-600" />
        {t('admin.planManagement')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const boolFeatures: (keyof PlanFeatures)[] = ['gallery', 'playlist', 'tv_mode', 'white_label', 'themes']
          const featureLabels: Record<string, string> = {
            gallery: t('admin.featureGallery'),
            playlist: t('admin.featurePlaylist'),
            tv_mode: t('admin.featureTvMode'),
            white_label: t('admin.featureWhiteLabel'),
            themes: t('admin.featureThemes'),
          }
          const featuresRecord = plan.features as Record<keyof PlanFeatures, unknown> | undefined

          return (
            <div key={plan.id} className="border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{plan.id}</p>
                </div>
                <span className="text-sm font-semibold text-blue-600">
                  {plan.price === 0 ? t('common.free') : `$${plan.price.toLocaleString('es-CO')}`}
                </span>
              </div>

              <div className="space-y-3">
                {boolFeatures.map((feat) => {
                  const enabled = !!featuresRecord?.[feat]
                  return (
                    <div key={feat} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 capitalize">{featureLabels[feat]}</span>
                      <button
                        onClick={() => togglePlanFeature(plan.id, feat)}
                        title={enabled ? t('admin.disable') : t('admin.enable')}
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
                <Save className="h-4 w-4" /> {t('common.save')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
