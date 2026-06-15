import { fetchWikipediaData } from '../src/lib/wikipedia.js'

// Panel représentatif : footballeur (clubs), tennis (palmarès, sans clubs),
// pilote F1 (sport individuel), acteur prolifique (films classés), politicien,
// entrepreneur, scientifique, artiste, figure historique.
const slugs = [
  'Emmanuel_Macron',
  'Lionel_Messi',
  'Kylian_Mbappé',
  'Zinédine_Zidane',
  'Roger_Federer',
  'Rafael_Nadal',
  'Lewis_Hamilton',
  'Leonardo_DiCaprio',
  'Tom_Hanks',
  'Beyoncé',
  'Albert_Einstein',
  'Elon_Musk',
  'Victor_Hugo',
  'Napoléon_Ier',
]

function clubSummary(clubs: unknown): string {
  if (!Array.isArray(clubs)) return '—'
  return clubs
    .slice(0, 6)
    .map((c) => {
      const o = c as { name?: string; start_year?: number | null; end_year?: number | null; appearances?: number | null; goals?: number | null }
      const years = o.start_year ? `${o.start_year}–${o.end_year ?? ''}` : ''
      const stats = o.appearances != null ? ` (${o.appearances}m${o.goals != null ? `/${o.goals}b` : ''})` : ''
      return `${o.name}${years ? ` ${years}` : ''}${stats}`
    })
    .join(', ')
}

async function main() {
  for (const slug of slugs) {
    try {
      const data = await fetchWikipediaData(slug, 'fr')
      const info = data.infobox_data as Record<string, unknown>
      const highlights = Array.isArray(info.career_highlights) ? (info.career_highlights as unknown[]).length : 0
      console.log(JSON.stringify({
        slug,
        type: data.person_type,
        score: data.parse_quality_score,
        photo: !!data.photo_url,
        birth_year: info.birth_year ?? null,
        nationality: info.nationality ?? null,
        sport: info.sport ?? undefined,
        position: info.position ?? undefined,
        clubs: info.clubs !== undefined ? clubSummary(info.clubs) : undefined,
        national_team: (info.national_team as { name?: string } | null)?.name ?? undefined,
        highlights: highlights || undefined,
        notable_films: info.notable_films ?? undefined,
        has_profile_data:
          Array.isArray(info.roles) ? info.roles.length > 0
            : Array.isArray(info.clubs) ? (info.clubs.length > 0 || highlights > 0)
              : Boolean(info.domain || info.notable_work || info.era || info.notable_films),
      }))
    } catch (err) {
      console.log(JSON.stringify({ slug, error: err instanceof Error ? err.message : String(err) }))
    }
  }
}

main()
