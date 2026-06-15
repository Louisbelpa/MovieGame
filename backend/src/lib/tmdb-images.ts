// Sélection de backdrop TMDB pour les défis films/séries.
//
// Le « mieux noté » (vote_average max) tombe souvent sur l'affiche officielle ou
// une image promo, pas sur une scène. On préfère donc :
//  - les backdrops paysage proches du 16:9 (exclut posters / vignettes carrées) ;
//  - les backdrops sans langue (iso_639_1 null = pas de texte/logo incrusté) ;
//  - puis on pioche aléatoirement parmi le top candidats pour varier les images.

export interface TmdbBackdrop {
  file_path: string;
  vote_average?: number;
  width?: number;
  height?: number;
  aspect_ratio?: number;
  iso_639_1?: string | null;
}

const LANDSCAPE_MIN_RATIO = 1.6; // ~16:9 = 1.78 ; on tolère un peu en dessous
const TOP_POOL_SIZE = 5;

function ratioOf(b: TmdbBackdrop): number {
  if (typeof b.aspect_ratio === 'number' && b.aspect_ratio > 0) return b.aspect_ratio;
  if (b.width && b.height && b.height > 0) return b.width / b.height;
  return 0;
}

function scoreOf(b: TmdbBackdrop): number {
  const vote = typeof b.vote_average === 'number' ? b.vote_average : 0;
  const resBonus = (b.width ?? 0) >= 1280 ? 0.5 : 0;
  return vote + resBonus;
}

/**
 * Choisit le `file_path` du meilleur backdrop, ou `null` si la liste est vide.
 * `randomize` (défaut true) pioche dans le top {@link TOP_POOL_SIZE} pour varier ;
 * passer false pour un choix déterministe (le mieux scoré).
 */
export function pickBestBackdrop(
  backdrops: TmdbBackdrop[] | null | undefined,
  randomize = true,
): string | null {
  const all = (backdrops ?? []).filter((b) => b.file_path);
  if (all.length === 0) return null;

  // 1) priorité aux backdrops paysage ; sinon on retombe sur tout
  const landscape = all.filter((b) => ratioOf(b) >= LANDSCAPE_MIN_RATIO);
  const base = landscape.length > 0 ? landscape : all;

  // 2) priorité aux backdrops sans langue (textless) ; sinon on garde la base
  const textless = base.filter((b) => b.iso_639_1 == null);
  const pool = textless.length > 0 ? textless : base;

  const ranked = [...pool].sort((a, b) => scoreOf(b) - scoreOf(a));
  if (!randomize) return ranked[0].file_path;

  const top = ranked.slice(0, Math.min(TOP_POOL_SIZE, ranked.length));
  return top[Math.floor(Math.random() * top.length)].file_path;
}
