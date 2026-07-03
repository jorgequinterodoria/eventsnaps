const COLORS = {
    SPOTIFY_GREEN: [30, 215, 96] as const,
    DEEP_GREEN: [29, 185, 84] as const,
    CYAN: [0, 206, 209] as const,
    PURPLE: [138, 43, 226] as const,
    LIGHT_PURPLE: [186, 85, 211] as const,

    GRADIENT_STOPS: [
        { pos: 0, color: [30, 215, 96] },
        { pos: 0.35, color: [29, 185, 84] },
        { pos: 0.6, color: [0, 206, 209] },
        { pos: 0.85, color: [138, 43, 226] },
        { pos: 1, color: [186, 85, 211] },
    ] as const,
} as const;

export const VISUALIZER_CONFIG = {
    BAR_COUNT: 48,
    BAR_GAP: 2,
    CORNER_RADIUS: 3,
    ANIMATION_SPEED_DIVISOR: 1000,
    MAX_BAR_HEIGHT_FACTOR: 0.85,
    BASE_SHADOW_BLUR: 8,
    SHADOW_BLUR_MULTIPLIER: 6,
    BASE_BAR_HEIGHT: 4,

    ORGANIC_RATES: {
        FREQ_1_BASE: 0.8,
        FREQ_1_VAR: 0.6,
        FREQ_2_BASE: 1.5,
        FREQ_2_VAR: 1.2,
        FREQ_3_BASE: 2.5,
        FREQ_3_VAR: 1.5,
    },

    AMPLITUDES: {
        AMP_1_BASE: 0.5,
        AMP_1_VAR: 0.3,
        AMP_2_BASE: 0.2,
        AMP_2_VAR: 0.15,
        AMP_3_BASE: 0.1,
        AMP_3_VAR: 0.1,
    },

    PHASE_MULTIPLIERS: {
        WAVE_2: 1.7,
        WAVE_3: 2.3,
    },

    HEIGHT_CALCULATION: {
        BASE_MULT: 0.15,
    },

    BOUNDS: {
        LOW_CLAMP: 0.05,
        HIGH_CLAMP: 1,
    },

    GLOW_ALPHA: 0.5,

    GRADIENT_STOPS: [
        { pos: 0, color: COLORS.SPOTIFY_GREEN },
        { pos: 0.35, color: COLORS.DEEP_GREEN },
        { pos: 0.6, color: COLORS.CYAN },
        { pos: 0.85, color: COLORS.PURPLE },
        { pos: 1, color: COLORS.LIGHT_PURPLE },
    ] as const,

    GRADIENT_ALPHAS: [
        { stop: 0, alpha: 0.95 },
        { stop: 0.7, alpha: 0.7 },
        { stop: 1, alpha: 0.3 },
    ] as const
} as const
