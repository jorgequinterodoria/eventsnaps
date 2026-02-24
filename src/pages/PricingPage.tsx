import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Music, Camera, Crown, ArrowRight, Smartphone, Shield, Tv, Tag, Loader2 } from 'lucide-react'
import Footer from '@/components/Footer'
import { insforge } from '@/lib/insforge'
import type { Plan } from '@/lib/insforge'

// Feature labels for human-readable display
const FEATURE_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  playlist:    { label: 'Jukebox Colaborativo (Spotify/YouTube)', icon: <Music className="w-4 h-4 text-blue-400" /> },
  gallery:     { label: 'Galería de fotos ilimitada',             icon: <Camera className="w-4 h-4 text-yellow-400" /> },
  tv_mode:     { label: 'Modo TV (presentación en pantalla)',      icon: <Tv className="w-4 h-4 text-purple-400" /> },
  white_label: { label: 'Marca personalizada (White Label)',       icon: <Tag className="w-4 h-4 text-green-400" /> },
}

const formatPrice = (price: number) =>
  price === 0 ? 'Gratis' : `$${price.toLocaleString('es-CO')} COP/mes`

const PricingPage = () => {
  const navigate = useNavigate()
  const [showPayment, setShowPayment] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPlans = async () => {
      const { data } = await insforge.database
        .from('plans')
        .select('*')
        .order('price', { ascending: true })
      setPlans((data as Plan[]) || [])
      setLoading(false)
    }
    loadPlans()
  }, [])

  // Visible plans on pricing page: basic, pro, trial_pro
  const visiblePlans = plans.filter(p => ['basic', 'pro', 'trial_pro'].includes(p.id))

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            Planes y Precios
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Escoge el plan perfecto. Empieza con 24h gratis y mejora cuando lo necesites.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {visiblePlans.map((plan) => {
              const isTrial  = (plan.features as any)?.is_trial === true
              const isPro    = plan.id === 'pro'
              const isBasic  = plan.id === 'basic'

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl shadow-sm p-8 flex flex-col relative transition-all
                    ${isPro
                      ? 'bg-gradient-to-b from-blue-600 to-indigo-700 border border-blue-500 md:-translate-y-4 shadow-xl'
                      : isTrial
                      ? 'bg-gradient-to-b from-amber-50 to-orange-50 border-2 border-amber-300'
                      : 'bg-white border border-gray-200'
                    }`}
                >
                  {/* Badge */}
                  {isPro && (
                    <div className="absolute top-0 right-0 -mr-2 -mt-2">
                      <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide flex items-center shadow-md">
                        <Crown className="w-3 h-3 mr-1" /> Recomendado
                      </span>
                    </div>
                  )}
                  {isTrial && (
                    <div className="absolute top-0 right-0 -mr-2 -mt-2">
                      <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-md">
                        ✨ 24h Gratis
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-6">
                    <h3 className={`text-2xl font-semibold ${isPro ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    <div className={`mt-4 flex items-baseline text-4xl font-extrabold ${isPro ? 'text-white' : 'text-gray-900'}`}>
                      {formatPrice(plan.price)}
                    </div>
                    <p className={`mt-3 text-sm ${isPro ? 'text-blue-100' : isTrial ? 'text-amber-700' : 'text-gray-500'}`}>
                      {isTrial
                        ? 'Acceso completo Pro por 24 horas. Sin tarjeta de crédito.'
                        : isBasic
                        ? 'Gestión de música y pedidos en vivo.'
                        : 'Experiencia completa con fotos, Modo TV y marca propia.'}
                    </p>
                  </div>

                  {/* Features list (dynamic from JSON) */}
                  <ul className="mt-4 space-y-3 flex-1">
                    {Object.entries(FEATURE_LABELS).map(([key, meta]) => {
                      const enabled = (plan.features as any)?.[key] === true
                      return (
                        <li key={key} className={`flex items-start gap-2 ${!enabled ? 'opacity-40' : ''}`}>
                          {enabled
                            ? <Check className={`w-5 h-5 shrink-0 mt-0.5 ${isPro ? 'text-blue-300' : 'text-green-500'}`} />
                            : <X className="w-5 h-5 shrink-0 mt-0.5 text-gray-300" />
                          }
                          <span className={`text-sm flex items-center gap-1.5
                            ${isPro ? 'text-white' : enabled ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                            {meta.icon} {meta.label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>

                  {/* CTA */}
                  {isTrial ? (
                    <button
                      onClick={() => navigate('/auth?trial=1')}
                      className="mt-8 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow flex items-center justify-center gap-2"
                    >
                      Empezar Trial Gratis <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : isPro ? (
                    <button
                      onClick={() => setShowPayment(true)}
                      className="mt-8 w-full bg-white hover:bg-gray-50 text-blue-700 font-bold py-3 px-6 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                      Adquirir Plan Pro <ArrowRight className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/create')}
                      className="mt-8 w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-3 px-6 rounded-xl transition-colors"
                    >
                      Comenzar con Básico
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Payment Instructions */}
        {showPayment && (
          <div className="mt-16 max-w-3xl mx-auto bg-white rounded-2xl shadow p-8 border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Smartphone className="w-6 h-6 mr-3 text-purple-600" />
              Instrucciones de Pago (Nequi)
            </h3>
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-100 mb-6 text-purple-900">
              <p className="mb-4 font-medium text-lg">Procesamos los pagos de forma manual. Sigue estos pasos:</p>
              <ol className="list-decimal list-inside space-y-3 pl-2">
                <li>Abre tu aplicación de <strong>Nequi</strong>.</li>
                <li>Transfiere <strong className="text-xl">$100.000 COP</strong> al número:{' '}
                  <span className="font-mono text-xl bg-purple-200 px-2 py-1 rounded select-all mx-1">300 000 0000</span>
                </li>
                <li>Envía el comprobante al correo <strong>jquintedori@gmail.com</strong> indicando tu correo registrado en EventSnaps.</li>
              </ol>
            </div>
            <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg flex items-start gap-2">
              <Shield className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <p>Tu cuenta será actualizada al plan Pro en máximo 2–4 horas hábiles tras confirmar el pago.<br /><br />
                <em>Próximamente: Wompi y Mercado Pago.</em>
              </p>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default PricingPage
