export interface Palette {
  id: string
  name: string
  num: string
  vibe: string
  dark: boolean // light-mode palette?

  // Backgrounds
  bg: string
  surface: string
  surfaceDark: string
  surfaceGray: string
  border: string
  bodyGlowTop: string
  bodyGlowBottom: string

  // Text
  text: string
  textDim: string

  // Mode colors
  films: string
  filmsHover: string
  filmsSoft: string
  filmsRing: string

  series: string
  seriesHover: string
  seriesSoft: string
  seriesRing: string

  wiki: string
  wikiHover: string
  wikiSoft: string
  wikiRing: string

  // Utility
  green: string
  red: string

  // Brand gradient
  goldLight: string
  goldDeep: string
}

export const PALETTES: Palette[] = [
  {
    id: 'cinema-dore',
    name: 'Cinéma Doré',
    num: '01',
    vibe: 'Premium · Nuit',
    dark: true,
    bg: '#0b0b1a',
    surface: '#13132b',
    surfaceDark: '#0f0f22',
    surfaceGray: '#1a1a38',
    border: 'rgba(255,255,255,0.09)',
    bodyGlowTop: 'rgba(245,200,66,0.07)',
    bodyGlowBottom: 'rgba(78,205,196,0.04)',
    text: '#ece9e2',
    textDim: 'rgba(236,233,226,0.48)',
    films: '#f5c842',
    filmsHover: '#ffe07a',
    filmsSoft: 'rgba(245,200,66,0.13)',
    filmsRing: 'rgba(245,200,66,0.35)',
    series: '#4ecdc4',
    seriesHover: '#6ee0d8',
    seriesSoft: 'rgba(78,205,196,0.13)',
    seriesRing: 'rgba(78,205,196,0.34)',
    wiki: '#ff6b9d',
    wikiHover: '#ff8db5',
    wikiSoft: 'rgba(255,107,157,0.13)',
    wikiRing: 'rgba(255,107,157,0.34)',
    green: '#10b981',
    red: '#e63946',
    goldLight: '#ffe07a',
    goldDeep: '#c49820',
  },
  {
    id: 'velvet-cinema',
    name: 'Velvet Cinema',
    num: '02',
    vibe: 'Théâtre · Velouté',
    dark: true,
    bg: '#14101a',
    surface: '#1f1828',
    surfaceDark: '#1a1420',
    surfaceGray: '#261e30',
    border: 'rgba(255,255,255,0.08)',
    bodyGlowTop: 'rgba(212,160,96,0.08)',
    bodyGlowBottom: 'rgba(149,192,168,0.04)',
    text: '#f0e8db',
    textDim: 'rgba(240,232,219,0.48)',
    films: '#d4a060',
    filmsHover: '#e8b878',
    filmsSoft: 'rgba(212,160,96,0.14)',
    filmsRing: 'rgba(212,160,96,0.34)',
    series: '#95c0a8',
    seriesHover: '#aed1be',
    seriesSoft: 'rgba(149,192,168,0.14)',
    seriesRing: 'rgba(149,192,168,0.34)',
    wiki: '#e89aa6',
    wikiHover: '#f0b4bc',
    wikiSoft: 'rgba(232,154,166,0.14)',
    wikiRing: 'rgba(232,154,166,0.34)',
    green: '#4cb078',
    red: '#c04055',
    goldLight: '#e8b878',
    goldDeep: '#a87040',
  },
  {
    id: 'neon-arcade',
    name: 'Neon Arcade',
    num: '03',
    vibe: 'Vibrant · Viral',
    dark: true,
    bg: '#0e0a1f',
    surface: '#1a142e',
    surfaceDark: '#14102a',
    surfaceGray: '#221a38',
    border: 'rgba(255,255,255,0.10)',
    bodyGlowTop: 'rgba(200,255,61,0.08)',
    bodyGlowBottom: 'rgba(0,217,255,0.05)',
    text: '#f5f3ff',
    textDim: 'rgba(245,243,255,0.48)',
    films: '#c8ff3d',
    filmsHover: '#d8ff70',
    filmsSoft: 'rgba(200,255,61,0.12)',
    filmsRing: 'rgba(200,255,61,0.38)',
    series: '#00d9ff',
    seriesHover: '#33e4ff',
    seriesSoft: 'rgba(0,217,255,0.12)',
    seriesRing: 'rgba(0,217,255,0.38)',
    wiki: '#ff3da8',
    wikiHover: '#ff70c0',
    wikiSoft: 'rgba(255,61,168,0.12)',
    wikiRing: 'rgba(255,61,168,0.38)',
    green: '#00e066',
    red: '#ff4466',
    goldLight: '#d8ff70',
    goldDeep: '#99cc00',
  },
  {
    id: 'paper-press',
    name: 'Paper Press',
    num: '04',
    vibe: 'Print · Éditorial',
    dark: false,
    bg: '#f5f1e8',
    surface: '#ebe3d2',
    surfaceDark: '#e0d8c8',
    surfaceGray: '#d5ccba',
    border: 'rgba(31,26,20,0.12)',
    bodyGlowTop: 'rgba(184,133,46,0.06)',
    bodyGlowBottom: 'rgba(30,58,94,0.04)',
    text: '#1f1a14',
    textDim: 'rgba(31,26,20,0.48)',
    films: '#b8852e',
    filmsHover: '#d4a050',
    filmsSoft: 'rgba(184,133,46,0.12)',
    filmsRing: 'rgba(184,133,46,0.38)',
    series: '#1e3a5e',
    seriesHover: '#2a527a',
    seriesSoft: 'rgba(30,58,94,0.12)',
    seriesRing: 'rgba(30,58,94,0.38)',
    wiki: '#a8412e',
    wikiHover: '#c45540',
    wikiSoft: 'rgba(168,65,46,0.12)',
    wikiRing: 'rgba(168,65,46,0.38)',
    green: '#3d6e4a',
    red: '#a8412e',
    goldLight: '#d4a050',
    goldDeep: '#8b6020',
  },
  {
    id: 'midnight-studio',
    name: 'Midnight Studio',
    num: '05',
    vibe: 'Mono · Premium',
    dark: true,
    bg: '#050507',
    surface: '#11111a',
    surfaceDark: '#0c0c14',
    surfaceGray: '#18182a',
    border: 'rgba(255,255,255,0.07)',
    bodyGlowTop: 'rgba(232,198,110,0.07)',
    bodyGlowBottom: 'rgba(212,208,168,0.03)',
    text: '#ebebed',
    textDim: 'rgba(235,235,237,0.48)',
    films: '#e8c66e',
    filmsHover: '#f0d490',
    filmsSoft: 'rgba(232,198,110,0.13)',
    filmsRing: 'rgba(232,198,110,0.34)',
    series: '#d4d0a8',
    seriesHover: '#e0dcc0',
    seriesSoft: 'rgba(212,208,168,0.13)',
    seriesRing: 'rgba(212,208,168,0.34)',
    wiki: '#e8a888',
    wikiHover: '#f0c0a0',
    wikiSoft: 'rgba(232,168,136,0.13)',
    wikiRing: 'rgba(232,168,136,0.34)',
    green: '#6a9a72',
    red: '#c05050',
    goldLight: '#f0d490',
    goldDeep: '#b89040',
  },
  {
    id: 'coastal-indigo',
    name: 'Coastal Indigo',
    num: '06',
    vibe: 'Smart · Doux',
    dark: true,
    bg: '#0c1421',
    surface: '#16213a',
    surfaceDark: '#111c30',
    surfaceGray: '#1e2d4a',
    border: 'rgba(255,255,255,0.09)',
    bodyGlowTop: 'rgba(255,137,102,0.08)',
    bodyGlowBottom: 'rgba(108,208,177,0.05)',
    text: '#e6ecf3',
    textDim: 'rgba(230,236,243,0.48)',
    films: '#ff8966',
    filmsHover: '#ffa080',
    filmsSoft: 'rgba(255,137,102,0.13)',
    filmsRing: 'rgba(255,137,102,0.35)',
    series: '#6cd0b1',
    seriesHover: '#88dcc4',
    seriesSoft: 'rgba(108,208,177,0.13)',
    seriesRing: 'rgba(108,208,177,0.34)',
    wiki: '#b29bf5',
    wikiHover: '#c8b4ff',
    wikiSoft: 'rgba(178,155,245,0.13)',
    wikiRing: 'rgba(178,155,245,0.34)',
    green: '#4cb078',
    red: '#e63946',
    goldLight: '#ffa080',
    goldDeep: '#cc6640',
  },
  {
    id: 'pellicule',
    name: 'Pellicule Kodachrome',
    num: '07',
    vibe: 'Argentique · 70s',
    dark: true,
    bg: '#0d0b08',
    surface: '#1c1814',
    surfaceDark: '#181510',
    surfaceGray: '#241f18',
    border: 'rgba(255,255,255,0.08)',
    bodyGlowTop: 'rgba(232,177,74,0.08)',
    bodyGlowBottom: 'rgba(90,138,82,0.05)',
    text: '#f0e4d0',
    textDim: 'rgba(240,228,208,0.48)',
    films: '#e8b14a',
    filmsHover: '#f4c870',
    filmsSoft: 'rgba(232,177,74,0.13)',
    filmsRing: 'rgba(232,177,74,0.35)',
    series: '#5a8a52',
    seriesHover: '#72a268',
    seriesSoft: 'rgba(90,138,82,0.14)',
    seriesRing: 'rgba(90,138,82,0.38)',
    wiki: '#d44a3e',
    wikiHover: '#e06858',
    wikiSoft: 'rgba(212,74,62,0.13)',
    wikiRing: 'rgba(212,74,62,0.35)',
    green: '#5a8a52',
    red: '#d44a3e',
    goldLight: '#f4c870',
    goldDeep: '#b07820',
  },
]

export const DEFAULT_PALETTE_ID = 'cinema-dore'
const STORAGE_KEY = 'gt_palette'

export function getSavedPaletteId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_PALETTE_ID
  } catch {
    return DEFAULT_PALETTE_ID
  }
}

export function savePaletteId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignore
  }
}

export function applyPalette(palette: Palette): void {
  const root = document.documentElement
  const s = (prop: string, val: string) => root.style.setProperty(prop, val)

  // Backgrounds
  s('--color-film-black', palette.bg)
  s('--color-film-dark', palette.surfaceDark)
  s('--color-film-gray', palette.surfaceGray)
  s('--color-film-surface', palette.surface)
  s('--color-film-border', palette.border)
  s('--body-glow-top', palette.bodyGlowTop)
  s('--body-glow-bottom', palette.bodyGlowBottom)
  // Also set body bg directly so it picks up the new bg color
  document.body.style.backgroundColor = palette.bg

  // Text
  s('--color-film-text', palette.text)
  s('--color-film-text-dim', palette.textDim)

  // Brand (films)
  s('--color-film-gold', palette.films)
  s('--color-film-gold-light', palette.goldLight)
  s('--color-film-gold-deep', palette.goldDeep)

  // Mode tokens
  s('--sg-films', palette.films)
  s('--sg-films-hover', palette.filmsHover)
  s('--sg-films-soft', palette.filmsSoft)
  s('--sg-films-ring', palette.filmsRing)
  s('--sg-todo', palette.films)
  s('--sg-todo-soft', palette.filmsSoft)
  s('--sg-todo-ring', palette.filmsRing)

  s('--sg-series', palette.series)
  s('--sg-series-hover', palette.seriesHover)
  s('--sg-series-soft', palette.seriesSoft)
  s('--sg-series-ring', palette.seriesRing)

  s('--sg-wiki', palette.wiki)
  s('--sg-wiki-hover', palette.wikiHover)
  s('--sg-wiki-soft', palette.wikiSoft)
  s('--sg-wiki-ring', palette.wikiRing)

  // Utility
  s('--color-film-green', palette.green)
  s('--color-film-red', palette.red)

  // Shadow glow (brand color)
  const glow = palette.filmsSoft.replace('0.13', '0.20')
  s('--shadow-glow', `0 0 24px ${glow}`)

  // data attribute for CSS targeting
  root.setAttribute('data-palette', palette.id)

  // Light-mode body class
  if (!palette.dark) {
    document.body.classList.add('palette-light')
  } else {
    document.body.classList.remove('palette-light')
  }
}
