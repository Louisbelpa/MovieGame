import { Film, Tv } from 'lucide-react'

export function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-film-black text-film-text px-4">
      <div className="mb-10 text-center">
        <h1 className="font-title text-4xl font-bold text-gradient-gold tracking-tight mb-2">
          CinéGuessr
        </h1>
        <p className="text-film-text-dim text-sm">Devine le titre à partir d'une image</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <a
          href="/film"
          className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border border-film-border bg-film-gray hover:border-film-gold/60 hover:bg-film-gray/80 transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-xl bg-film-gold/10 flex items-center justify-center group-hover:bg-film-gold/20 transition-colors">
            <Film size={28} className="text-film-gold" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-film-text text-lg">Films</p>
            <p className="text-film-text-dim text-sm mt-0.5">Le film du jour</p>
          </div>
        </a>

        <a
          href="/series"
          className="flex-1 flex flex-col items-center gap-3 p-6 rounded-2xl border border-film-border bg-film-gray hover:border-film-gold/60 hover:bg-film-gray/80 transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 rounded-xl bg-film-gold/10 flex items-center justify-center group-hover:bg-film-gold/20 transition-colors">
            <Tv size={28} className="text-film-gold" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-film-text text-lg">Séries</p>
            <p className="text-film-text-dim text-sm mt-0.5">La série du jour</p>
          </div>
        </a>
      </div>
    </div>
  )
}
