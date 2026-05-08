import type { ReactNode } from 'react'
import { Film, Tv, Sparkles, Eye, Keyboard, Lightbulb, Landmark } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Footer } from '@/components/layout/Footer'
import { FEATURES, BRAND_NAME } from '@/config/features'
import {
  NewModesAnnouncementModal,
  NEW_MODES_ANNOUNCEMENT_STORAGE_KEY,
  type NewModesAnnouncementVariant,
} from '@/components/modals/NewModesAnnouncementModal'

type IconPhase = 'film' | 'tv' | 'wiki'

export function HomePage() {
  const [iconPhase, setIconPhase] = useState<IconPhase>('film')
  const [announcementVariant, setAnnouncementVariant] = useState<NewModesAnnouncementVariant | null>(null)
  const [showNewBadge, setShowNewBadge] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(NEW_MODES_ANNOUNCEMENT_STORAGE_KEY)) {
        if (FEATURES.enableSeries && FEATURES.enableWiki) setAnnouncementVariant('both')
        else if (FEATURES.enableSeries) setAnnouncementVariant('series')
        else if (FEATURES.enableWiki) setAnnouncementVariant('wiki')
        setShowNewBadge(true)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const modes: IconPhase[] = FEATURES.enableWiki
      ? (FEATURES.enableSeries ? ['film', 'tv', 'wiki'] : ['film', 'wiki'])
      : (FEATURES.enableSeries ? ['film', 'tv'] : ['film'])
    if (modes.length < 2) return
    let i = 0
    const id = window.setInterval(() => {
      i = (i + 1) % modes.length
      setIconPhase(modes[i])
    }, 2800)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="min-h-dvh flex flex-col bg-film-black text-film-text px-4 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(clamp(30rem, 48vw, 56rem) clamp(20rem, 34vw, 38rem) at 10% 6%, rgba(245, 197, 66, 0.18), transparent 62%), radial-gradient(clamp(28rem, 46vw, 54rem) clamp(18rem, 32vw, 36rem) at 92% 78%, rgba(245, 197, 66, 0.16), transparent 64%)',
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
                <motion.span
                  key={iconPhase}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="absolute inset-0 inline-flex items-center justify-center"
                  style={{ color: 'var(--film-gold, #f5c542)' }}
                >
                  {iconPhase === 'tv' ? <Tv size={20} /> : iconPhase === 'wiki' ? <Landmark size={20} /> : <Film size={20} />}
                </motion.span>
              </AnimatePresence>
            </span>

            <h1 className="font-title text-5xl sm:text-6xl font-bold text-gradient-gold tracking-tight">
              {BRAND_NAME}
            </h1>
          </div>
          <p className="text-film-text-dim text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            {FEATURES.enableWiki
              ? 'Devinez le film, la série ou la personnalité du jour.'
              : FEATURES.enableSeries
                ? 'Devinez le film ou la série du jour.'
                : 'Devinez le film du jour.'}
          </p>
          <p className="text-film-text-dim text-sm sm:text-base max-w-xl mx-auto leading-relaxed mt-1">
            {FEATURES.enableWiki
              ? 'Des indices progressifs se débloquent à chaque erreur. Trois modes de jeu, un défi par jour.'
              : 'Une image, 5 tentatives, des indices qui se débloquent à chaque erreur.'}
          </p>
        </div>

        <div className={`grid gap-4 w-full max-w-4xl mx-auto mb-8 ${FEATURES.enableWiki ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
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
              className="group relative rounded-2xl border border-[#33bc97] bg-gradient-to-br from-[#1eb088]/28 via-[#1eb088]/14 to-transparent p-6 sm:p-7 hover:from-[#1eb088]/36 hover:via-[#1eb088]/20 transition-all duration-200 cursor-pointer shadow-[0_0_0_1px_rgba(30,176,136,0.12),0_12px_28px_rgba(10,12,24,0.35)]"
              style={{
                borderColor: 'var(--sg-series)',
              }}
            >
              {showNewBadge && (
                <span className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#1eb088]/20 text-[#7ad2b8] border border-[#1eb088]/30">
                  Nouveau
                </span>
              )}
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

          {FEATURES.enableWiki && (
            <a
              href="/wiki"
              className="group relative rounded-2xl border border-[#9a7cf6] bg-gradient-to-br from-[#8b5cf6]/26 via-[#8b5cf6]/14 to-transparent p-6 sm:p-7 hover:from-[#8b5cf6]/34 hover:via-[#8b5cf6]/20 transition-all duration-200 cursor-pointer shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_12px_28px_rgba(10,12,24,0.35)]"
            >
              {showNewBadge && (
                <span className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/30">
                  Nouveau
                </span>
              )}
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(139, 92, 246, 0.20)' }}>
                <Landmark size={28} style={{ color: '#c4b5fd' }} />
              </div>
              <div>
                <p className="font-semibold text-film-text text-xl">Mode Wikipedia</p>
                <p className="text-film-text-dim text-sm mt-1">
                  Devinez la personnalité du jour grâce à des indices progressifs issus de Wikipedia.
                </p>
                <p className="text-sm font-medium mt-4 text-[#c4b5fd] group-hover:text-[#d7ccff] transition-colors">Jouer en mode Wikipedia</p>
              </div>
            </a>
          )}
        </div>

        <section className="max-w-3xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-wider text-film-text-dim mb-3">Comment jouer</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <HowToCard
              icon={<Eye size={15} className="text-film-gold" />}
              title="1. Observez les indices"
              description={FEATURES.enableWiki ? "Une image (films/séries) ou un profil (Wikipedia) s'affiche." : "Regardez l'image du jour et repérez les détails utiles."}
            />
            <HowToCard
              icon={<Keyboard size={15} className="text-film-gold" />}
              title="2. Faites une proposition"
              description={FEATURES.enableWiki ? "Entrez un titre ou un nom. Chaque mode a son propre compteur de tentatives." : "Entrez un titre de film ou de série. Vous avez 5 tentatives."}
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

      {announcementVariant && (
        <NewModesAnnouncementModal
          isOpen={true}
          onClose={() => setAnnouncementVariant(null)}
          variant={announcementVariant}
        />
      )}
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
      <p className="text-film-text-dim text-sm">{description}</p>
    </div>
  )
}