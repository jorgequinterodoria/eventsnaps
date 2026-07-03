import { useState, useCallback } from 'react'
import { insforge } from '../lib/insforge'
import type { Plan, PlanFeatures } from '../lib/insforge'
import { useAlert } from '../contexts/AlertContext'

export const useAdminPlans = () => {
    const [plans, setPlans] = useState<Plan[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const { showAlert } = useAlert()

    const loadPlans = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data } = await insforge.database
                .from('plans')
                .select('*')
                .order('price', { ascending: true })
            setPlans((data as Plan[]) || [])
        } finally {
            setIsLoading(false)
        }
    }, [])

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

    return {
        plans,
        isLoadingPlans: isLoading,
        loadPlans,
        togglePlanFeature,
        savePlan,
    }
}
