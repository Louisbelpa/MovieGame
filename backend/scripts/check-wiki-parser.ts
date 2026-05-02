import { fetchWikipediaData } from '../src/lib/wikipedia.js'

const slugs = [
  'Emmanuel_Macron',
  'Lionel_Messi',
  'Kylian_Mbappé',
  'Beyoncé',
  'Albert_Einstein',
  'Elon_Musk',
  'Victor_Hugo',
  'Napoléon_Ier',
]

async function main() {
  for (const slug of slugs) {
    try {
      const data = await fetchWikipediaData(slug, 'fr')
      const info = data.infobox_data as Record<string, unknown>
      console.log(JSON.stringify({
        slug,
        type: data.person_type,
        photo: !!data.photo_url,
        birth_year: info.birth_year ?? null,
        nationality: info.nationality ?? null,
        has_profile_data:
          Array.isArray(info.roles) ? info.roles.length > 0
            : Array.isArray(info.clubs) ? info.clubs.length > 0
              : Boolean(info.domain || info.notable_work || info.era),
      }))
    } catch (err) {
      console.log(JSON.stringify({ slug, error: err instanceof Error ? err.message : String(err) }))
    }
  }
}

main()
