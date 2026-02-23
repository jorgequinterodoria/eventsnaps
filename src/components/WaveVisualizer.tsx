import { useEffect, useRef } from "react"

export default function WaveVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    const BAR_COUNT = 48
    const BAR_GAP = 2
    const CORNER_RADIUS = 3

    // Each bar has its own phase, frequency, and amplitude for organic motion
    const barParams = Array.from({ length: BAR_COUNT }, (_, i) => ({
      phase: Math.random() * Math.PI * 2,
      freq1: 0.8 + Math.random() * 0.6,
      freq2: 1.5 + Math.random() * 1.2,
      freq3: 2.5 + Math.random() * 1.5,
      amp1: 0.5 + Math.random() * 0.3,
      amp2: 0.2 + Math.random() * 0.15,
      amp3: 0.1 + Math.random() * 0.1,
      baseHeight: 0.15 + (Math.sin(i / BAR_COUNT * Math.PI) * 0.15),
    }))

    // Gradient colors (Spotify-inspired green → cyan → purple)
    const gradientStops = [
      { pos: 0, color: [30, 215, 96] },    // Spotify green
      { pos: 0.35, color: [29, 185, 84] },  // Deep green  
      { pos: 0.6, color: [0, 206, 209] },   // Cyan
      { pos: 0.85, color: [138, 43, 226] }, // Purple
      { pos: 1, color: [186, 85, 211] },    // Light purple
    ]

    function getBarColor(normalizedIndex: number, alpha: number = 1): string {
      let startStop = gradientStops[0]
      let endStop = gradientStops[gradientStops.length - 1]

      for (let i = 0; i < gradientStops.length - 1; i++) {
        if (normalizedIndex >= gradientStops[i].pos && normalizedIndex <= gradientStops[i + 1].pos) {
          startStop = gradientStops[i]
          endStop = gradientStops[i + 1]
          break
        }
      }

      const range = endStop.pos - startStop.pos
      const t = range > 0 ? (normalizedIndex - startStop.pos) / range : 0
      const r = Math.round(startStop.color[0] + (endStop.color[0] - startStop.color[0]) * t)
      const g = Math.round(startStop.color[1] + (endStop.color[1] - startStop.color[1]) * t)
      const b = Math.round(startStop.color[2] + (endStop.color[2] - startStop.color[2]) * t)
      return `rgba(${r},${g},${b},${alpha})`
    }

    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      r = Math.min(r, w / 2, h / 2)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener("resize", resize)

    const animate = () => {
      const w = canvas.getBoundingClientRect().width
      const h = canvas.getBoundingClientRect().height
      const time = Date.now() / 1000

      ctx.clearRect(0, 0, w, h)

      const totalBarWidth = (w - BAR_GAP * (BAR_COUNT - 1)) / BAR_COUNT
      const barWidth = Math.max(2, totalBarWidth)
      const maxBarHeight = h * 0.85

      for (let i = 0; i < BAR_COUNT; i++) {
        const p = barParams[i]
        const normalizedI = i / (BAR_COUNT - 1)

        // Multi-frequency sine wave for organic movement
        const wave1 = Math.sin(time * p.freq1 + p.phase) * p.amp1
        const wave2 = Math.sin(time * p.freq2 + p.phase * 1.7) * p.amp2
        const wave3 = Math.sin(time * p.freq3 + p.phase * 2.3) * p.amp3
        const combined = p.baseHeight + wave1 + wave2 + wave3

        // Clamp between 0.05 and 1
        const heightFactor = Math.min(1, Math.max(0.05, (combined + 1) / 2))
        const barHeight = Math.max(4, heightFactor * maxBarHeight)

        const x = i * (barWidth + BAR_GAP)
        const y = h - barHeight

        // Glow effect — draw blurred version behind
        ctx.save()
        ctx.shadowColor = getBarColor(normalizedI, 0.5)
        ctx.shadowBlur = 8 + heightFactor * 6
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        // Create vertical gradient for each bar
        const barGrad = ctx.createLinearGradient(x, y, x, h)
        barGrad.addColorStop(0, getBarColor(normalizedI, 0.95))
        barGrad.addColorStop(0.7, getBarColor(normalizedI, 0.7))
        barGrad.addColorStop(1, getBarColor(normalizedI, 0.3))

        ctx.fillStyle = barGrad
        roundRect(ctx, x, y, barWidth, barHeight, CORNER_RADIUS)
        ctx.fill()
        ctx.restore()
      }

      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <div className="wave-visualizer-container">
      <div className="wave-visualizer-label">
        <span className="wave-dot"></span>
        SONANDO AHORA
      </div>
      <canvas ref={canvasRef} className="wave-canvas" />
      <style>{`
        .wave-visualizer-container {
          position: relative;
          background: linear-gradient(135deg, rgba(15, 15, 25, 0.95), rgba(25, 20, 40, 0.9));
          border-radius: 16px;
          padding: 16px 16px 12px;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }
        .wave-visualizer-container::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: radial-gradient(ellipse at 50% 100%, rgba(30, 215, 96, 0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .wave-visualizer-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 2px;
          color: rgba(30, 215, 96, 0.8);
          margin-bottom: 10px;
          text-transform: uppercase;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .wave-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1ed760;
          animation: wavePulse 1.5s ease-in-out infinite;
          box-shadow: 0 0 6px rgba(30, 215, 96, 0.6);
        }
        @keyframes wavePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        .wave-canvas {
          width: 100%;
          height: 80px;
          display: block;
        }
      `}</style>
    </div>
  )
}
