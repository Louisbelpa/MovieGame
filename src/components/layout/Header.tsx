import { CandyNav } from '@/components/layout/CandyNav'

interface HeaderProps {
  mode: 'film' | 'series' | 'wiki'
}

/** Nav des pages de jeu — onglet « Jeux du jour » actif (maquette CandyGamePage). */
export function Header({ mode: _mode }: HeaderProps) {
  return <CandyNav active="jeux" />
}
