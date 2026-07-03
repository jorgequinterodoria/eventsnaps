import { useState, useCallback } from 'react'
import { insforge } from '../lib/insforge'
import { UserProfile } from '../types/admin'

export const useAdminUsers = () => {
    const [users, setUsers] = useState<UserProfile[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const loadUsers = useCallback(async () => {
        setIsLoading(true)
        try {
            const { data: usersData } = await insforge.database
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false })
            setUsers(usersData || [])
        } finally {
            setIsLoading(false)
        }
    }, [])

    const updateUserPlan = async (userId: string, plan_id: string) => {
        await insforge.database.from('user_profiles').update({ plan_id }).eq('id', userId)
        await loadUsers()
    }

    const updateUserStatus = async (userId: string, status: string) => {
        await insforge.database.from('user_profiles').update({ status }).eq('id', userId)
        await loadUsers()
    }

    return {
        users,
        isLoadingUsers: isLoading,
        loadUsers,
        updateUserPlan,
        updateUserStatus,
    }
}
