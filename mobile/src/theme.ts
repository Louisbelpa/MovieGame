export const colors = {
  bg: '#0d1117',
  surface: '#131a23',
  surface2: '#1a212c',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  text: '#e6e8eb',
  textDim: '#9aa3ad',
  textFaint: '#5f6772',
  textMuted: '#5f6772',
  gold: '#d4a64a',
  goldSoft: 'rgba(212,166,74,0.16)',
  goldRing: 'rgba(212,166,74,0.30)',
  films: '#4d8ee8',
  filmsSoft: 'rgba(77,142,232,0.16)',
  filmsRing: 'rgba(77,142,232,0.32)',
  series: '#1eb088',
  seriesSoft: 'rgba(30,176,136,0.16)',
  seriesRing: 'rgba(30,176,136,0.32)',
  wiki: '#9b7de8',
  wikiSoft: 'rgba(155,125,232,0.16)',
  wikiRing: 'rgba(155,125,232,0.32)',
  green: '#4cb078',
  red: '#d4604a',
  white: '#ffffff',
};

export const accentFor = (mediaType: 'film' | 'series' | 'wiki') => {
  if (mediaType === 'wiki')   return { color: colors.wiki,   soft: colors.wikiSoft,   ring: colors.wikiRing };
  if (mediaType === 'series') return { color: colors.series, soft: colors.seriesSoft, ring: colors.seriesRing };
  return                             { color: colors.films,  soft: colors.filmsSoft,  ring: colors.filmsRing };
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 999,
};

export const font = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};
