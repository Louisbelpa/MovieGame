import type { ReactNode } from 'react'
import { Film, Tv, Sparkles, Eye, Keyboard, Lightbulb } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Footer } from '@/components/layout/Footer'
import { FEATURES, BRAND_NAME } from '@/config/features'


export function HomePage() {
  const [showTvIcon, setShowTvIcon] = useState(false)

  useEffect(() => {
    if (!FEATURES.enableSeries) return
    const id = window.setInterval(() => {
      setShowTvIcon((prev) => !prev)
    }, 2800)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="min-h-dvh flex flex-col bg-film-black text-film-text px-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(clamp(30rem, 48vw, 56rem) clamp(20rem, 34vw, 38rem) at 8% -6%, rgba(245, 197, 66, 0.18), transparent 62%), radial-gradient(clamp(28rem, 46vw, 54rem) clamp(18rem, 32vw, 36rem) at 92% 78%, rgba(245, 197, 66, 0.16), transparent 64%)',
        }}
      />

      <div className="flex-1 w-full max-w-5xl mx-auto py-10 sm:py-14 relative">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-film-gold border border-film-gold/30 bg-film-gold/10">
              <Sparkles size={12} />
              Défi quotidien
            </span>
          </div>
          <div className="inline-flex items-center gap-2 sm:gap-2.5 mb-3">
            <span className="relative w-6 h-6 inline-flex items-center justify-center" aria-hidden>
              <AnimatePresence mode="wait">
                {FEATURES.enableSeries ? (
                  showTvIcon ? (
                    <motion.span
                      key="tv"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="absolute inset-0 inline-flex items-center justify-center text-film-gold"
                    >
                      <Tv size={20} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="film"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="absolute inset-0 inline-flex items-center justify-center text-film-gold"
                    >
                      <Film size={20} />
                    </motion.span>
                  )
                ) : (
                  <motion.span
                    key="film-static"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 inline-flex items-center justify-center text-film-gold"
                  >
                    <Film size={20} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>

            <h1 className="font-title text-5xl sm:text-6xl font-bold text-gradient-gold tracking-tight">
              {BRAND_NAME}
            </h1>
          </div>
          <p className="text-film-text-dim text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Devinez le film ou la série du jour.
          </p>
          <p className="text-film-text-dim text-sm sm:text-base max-w-xl mx-auto leading-relaxed mt-1">
            Une image, 5 tentatives, des indices qui se débloquent à chaque erreur.
          </p>
        </div>

        <div className="grid gap-4 w-full max-w-3xl mx-auto mb-8 sm:grid-cols-2">
          <a
            href="/films"
            className="group rounded-2xl border border-[#5a95ea] bg-gradient-to-br from-[#4d8ee8]/30 via-[#4d8ee8]/18 to-transparent p-6 sm:p-7 hover:from-[#4d8ee8]/40 hover:via-[#4d8ee8]/22 transition-all duration-200 cursor-pointer shadow-[0_0_0_1px_rgba(77,142,232,0.15),0_12px_28px_rgba(10,12,24,0.35)]"
            style={{
              borderColor: 'var(--sg-films)',
            }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(77, 142, 232, 0.20)' }}>
              <Film size={28} style={{ color: 'var(--sg-films)' }} />
            </div>
            <div>
              <p className="font-semibold text-film-text text-xl">Mode Films</p>
              <p className="text-film-text-dim text-sm mt-1">
                Chaque jour, devinez un film à partir d'une image en 5 tentatives, avec des indices qui se débloquent au fil de la partie.
              </p>
              <p className="text-sm font-medium mt-4 text-[#8fb8f3] group-hover:text-[#a8c7f8] transition-colors">Jouer en mode Films</p>
            </div>
          </a>

          {FEATURES.enableSeries ? (
            <a
              href="/series"
              className="group rounded-2xl border border-[#33bc97] bg-gradient-to-br from-[#1eb088]/28 via-[#1eb088]/14 to-transparent p-6 sm:p-7 hover:from-[#1eb088]/36 hover:via-[#1eb088]/20 transition-all duration-200 cursor-pointer shadow-[0_0_0_1px_rgba(30,176,136,0.12),0_12px_28px_rgba(10,12,24,0.35)]"
              style={{
                borderColor: 'var(--sg-series)',
              }}          
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(30, 176, 136, 0.20)' }}>
                <Tv size={28} style={{ color: 'var(--sg-series)' }} />
              </div>
              <div>
                <p className="font-semibold text-film-text text-xl">Mode Séries</p>
                <p className="text-film-text-dim text-sm mt-1">
                  Le même principe côté séries : une image, 5 tentatives, et des indices progressifs pour trouver le bon titre.
                </p>
                <p className="text-sm font-medium mt-4 text-[#7ad2b8] group-hover:text-[#93dfca] transition-colors">Jouer en mode Séries</p>
              </div>
            </a>
          ) : (
            <div
              className="rounded-2xl border border-[#2c8f76] bg-gradient-to-br from-[#1eb088]/16 via-[#1eb088]/8 to-transparent p-6 sm:p-7 opacity-80 shadow-[0_0_0_1px_rgba(30,176,136,0.08),0_12px_28px_rgba(10,12,24,0.30)]"
              aria-disabled="true"
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(30, 176, 136, 0.16)' }}>
                <Tv size={28} style={{ color: 'var(--sg-series)' }} />
              </div>
              <div>
                <p className="font-semibold text-film-text text-xl">Mode Séries</p>
                <p className="text-film-text-dim text-sm mt-1">
                  Le mode Séries arrive bientôt. Le temps de compléter le catalogue.
                </p>
                <p className="text-sm font-medium mt-4 text-[#7ad2b8]">Bientôt disponible</p>
              </div>
            </div>
          )}
        </div>

        <section className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-film-text-dim mb-3">Comment jouer</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <HowToCard
              icon={<Eye size={15} className="text-film-gold" />}
              title="1. Observez l'image"
              description="Regardez l'image du jour et repérez les détails utiles."
            />
            <HowToCard
              icon={<Keyboard size={15} className="text-film-gold" />}
              title="2. Faites une proposition"
              description="Entrez un titre de film ou de série. Vous avez 5 tentatives."
            />
            <HowToCard
              icon={<Lightbulb size={15} className="text-film-gold" />}
              title="3. Exploitez les indices"
              description="Chaque mauvaise réponse débloque un nouvel indice pour vous aider."
            />
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}

function HowToCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="film-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="font-semibold text-film-text text-sm">{title}</p>
      </div>
      <p className="text-film-text-dim text-xs sm:text-sm">{description}</p>
    </div>
  )
}