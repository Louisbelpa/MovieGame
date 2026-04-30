import { Film, Tv } from 'lucide-react'
import { Footer } from '@/components/layout/Footer'


export function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col bg-film-black text-film-text px-4">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-10 text-center">
          <h1 className="font-title text-4xl font-bold text-gradient-gold tracking-tight mb-2">
            CinéGuessr
          </h1>
          <p className="text-film-text-dim text-sm">Devine le titre à partir d'une image</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <a
            href="/films"
            className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border"
            style={{
              borderColor: 'var(--sg-films)',
              background: 'rgba(77, 142, 232, 0.08)',
              transition: 'border-color 150ms, background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sg-films-hover)'; e.currentTarget.style.background = 'rgba(77, 142, 232, 0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sg-films)'; e.currentTarget.style.background = 'rgba(77, 142, 232, 0.08)'; }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(77, 142, 232, 0.14)' }}>
              <Film size={28} style={{ color: 'var(--sg-films)' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-film-text text-lg">Films</p>
              <p className="text-film-text-dim text-sm mt-0.5">Le film du jour</p>
            </div>
          </a>

          <a
            href="/series"
            className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border"
            style={{
              borderColor: 'var(--sg-series)',
              background: 'rgba(30, 176, 136, 0.08)',
              transition: 'border-color 150ms, background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sg-series-hover)'; e.currentTarget.style.background = 'rgba(30, 176, 136, 0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--sg-series)'; e.currentTarget.style.background = 'rgba(30, 176, 136, 0.08)'; }}
          >
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(30, 176, 136, 0.14)' }}>
              <Tv size={28} style={{ color: 'var(--sg-series)' }} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-film-text text-lg">Séries</p>
              <p className="text-film-text-dim text-sm mt-0.5">La série du jour</p>
            </div>
          </a>
        </div>
      </div>
      <Footer />
    </div>
  )
}