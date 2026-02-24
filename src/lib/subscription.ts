/**
 * subscription.ts
 * ---------------
 * Core SaaS subscription helpers for EventSnaps.
 *
 * Responsibilities:
 *  - Retrieve the user's active subscription & plan features
 *  - Feature-gate access (returns 403-style result when blocked)
 *  - Dynamic branding (white_label flag → DJ logo vs EventSnaps logo)
 */

import { insforge } from './insforge'
import type { PlanFeatures, UserSubscription } from './insforge'

// ─── Default fallback features (no plan / error case) ──────────────────────
const DEFAULT_FEATURES: PlanFeatures = {
    gallery: false,
    playlist: true,
    tv_mode: false,
    white_label: false,
    max_storage_gb: 0.5,
}

// ─── Feature check result ───────────────────────────────────────────────────
export interface FeatureCheckResult {
    allowed: boolean
    message?: string
}

// ─── Branding config ────────────────────────────────────────────────────────
export interface BrandingConfig {
    showDJLogo: boolean        // true = use DJ's custom logo
    logoUrl: string | null     // custom DJ logo URL (null → use EventSnaps default)
    djName: string | null
}

// ─── getUserSubscription ────────────────────────────────────────────────────
/**
 * Fetches the user's *active or trialing* subscription from `user_subscriptions`
 * joined with their plan features. Returns null if none exists.
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await insforge.database
        .from('user_subscriptions')
        .select('*, plans(*)')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)

    if (error || !data || (data as any[]).length === 0) return null
    return (data as any[])[0] as UserSubscription
}

// ─── getPlanFeatures ────────────────────────────────────────────────────────
/**
 * Fetches the features object for a given plan_id.
 * Falls back to DEFAULT_FEATURES on error.
 */
export async function getPlanFeatures(planId: string): Promise<PlanFeatures> {
    const { data, error } = await insforge.database
        .from('plans')
        .select('features')
        .eq('id', planId)
        .single()

    if (error || !data?.features) return DEFAULT_FEATURES
    return data.features as PlanFeatures
}

// ─── resolveUserFeatures ─────────────────────────────────────────────────────
/**
 * Resolves a user's current features by:
 *  1. Checking user_subscriptions (active/trialing)
 *  2. Falling back to user_profiles.plan_id
 *  3. Final fallback: DEFAULT_FEATURES
 */
export async function resolveUserFeatures(userId: string): Promise<PlanFeatures> {
    // Try subscription first
    const subscription = await getUserSubscription(userId)
    if (subscription?.plans?.features) {
        return subscription.plans.features as PlanFeatures
    }

    // Fallback: read plan_id from user_profiles
    const { data: profile } = await insforge.database
        .from('user_profiles')
        .select('plan_id')
        .eq('id', userId)
        .single()

    if (profile?.plan_id) {
        return getPlanFeatures(profile.plan_id)
    }

    return DEFAULT_FEATURES
}

// ─── checkFeature ───────────────────────────────────────────────────────────
/**
 * Middleware/guard: checks if a user's active plan has a specific feature enabled.
 *
 * @returns FeatureCheckResult
 *   - { allowed: true }  → proceed
 *   - { allowed: false, message: '...' }  → show upgrade prompt / block action
 *
 * Usage example:
 *   const check = await checkFeature(userId, 'gallery')
 *   if (!check.allowed) { showAlert(check.message!); return }
 */
export async function checkFeature(
    userId: string,
    feature: keyof PlanFeatures
): Promise<FeatureCheckResult> {
    try {
        const features = await resolveUserFeatures(userId)
        const value = features[feature]

        if (typeof value === 'boolean') {
            return value
                ? { allowed: true }
                : { allowed: false, message: 'Mejora tu plan para usar esta función' }
        }

        // Numeric features (e.g. max_storage_gb): always "allowed" — caller checks threshold separately
        return { allowed: true }
    } catch {
        // Fail-open is risky; fail-closed is safer for commercial features
        return { allowed: false, message: 'No se pudo verificar tu plan. Intenta nuevamente.' }
    }
}

// ─── activateTrial ──────────────────────────────────────────────────────────
/**
 * Call this right after a new user registers.
 * - Checks that the user (by email) has never used a trial before.
 * - Creates a user_subscriptions row with plan_id='trial_pro', status='trialing',
 *   current_period_end = now + 24h.
 * Returns { activated: boolean, message?: string }
 */
export async function activateTrial(
    userId: string
): Promise<{ activated: boolean; message?: string }> {
    try {
        // 1. Abuse guard: check for any pre-existing subscription (including canceled/past_due)
        const { data: existing } = await insforge.database
            .from('user_subscriptions')
            .select('id, plan_id')
            .eq('user_id', userId)
            .limit(1)

        if (existing && (existing as any[]).length > 0) {
            return { activated: false, message: 'Ya tienes o tuviste una suscripción activa.' }
        }

        // 2. Insert trial subscription (24 hours)
        const periodEnd = new Date()
        periodEnd.setHours(periodEnd.getHours() + 24)

        const { error } = await insforge.database
            .from('user_subscriptions')
            .insert({
                user_id: userId,
                plan_id: 'trial_pro',
                status: 'trialing',
                current_period_end: periodEnd.toISOString(),
            })

        if (error) throw error
        return { activated: true }
    } catch (err: any) {
        console.error('[activateTrial]', err)
        return { activated: false, message: err?.message ?? 'Error activando trial.' }
    }
}

// ─── isTrialExpired ──────────────────────────────────────────────────────────
/**
 * Returns true if the user has an expired trialing subscription (past current_period_end).
 */
export async function isTrialExpired(userId: string): Promise<boolean> {
    const { data } = await insforge.database
        .from('user_subscriptions')
        .select('status, current_period_end, plan_id')
        .eq('user_id', userId)
        .eq('status', 'trialing')
        .limit(1)

    const row = data && (data as any[]).length > 0 ? (data as any[])[0] : null
    if (!row) return false
    if (!row.current_period_end) return false
    return new Date(row.current_period_end) < new Date()
}
/**
 * Returns branding configuration for the event page.
 * If the creator's plan has white_label = true AND they have a custom_logo_url
 * stored in user_profiles, their logo is shown. Otherwise EventSnaps branding applies.
 */
export async function getBrandingConfig(creatorId: string): Promise<BrandingConfig> {
    try {
        const features = await resolveUserFeatures(creatorId)

        if (!features.white_label) {
            return { showDJLogo: false, logoUrl: null, djName: null }
        }

        // Fetch optional logo & name from user_profiles
        const { data: profile } = await insforge.database
            .from('user_profiles')
            .select('full_name, custom_logo_url')
            .eq('id', creatorId)
            .single()

        return {
            showDJLogo: true,
            logoUrl: (profile as any)?.custom_logo_url ?? null,
            djName: profile?.full_name ?? null,
        }
    } catch {
        return { showDJLogo: false, logoUrl: null, djName: null }
    }
}
