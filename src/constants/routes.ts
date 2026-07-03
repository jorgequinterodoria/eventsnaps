export const ROUTES = {
    HOME: '/',
    AUTH: '/auth',
    PRICING: '/pricing',
    ADMIN_DASHBOARD: '/admin/dashboard',
    CREATE_EVENT: '/create',
    JOIN_EVENT: '/join',
    PROFILE: '/profile',
    EVENT_DETAIL: '/event/:code',
    MODERATE_EVENT: '/moderate/:code',
} as const

// Helper functions for dynamic routes
const getEventRoute = (code: string) => `/event/${code}`
const getModerateEventRoute = (code: string) => `/moderate/${code}`
