/**
 * layout/Footer.tsx
 * Site footer with legal links, contact and TMDB attribution.
 */

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { BRAND_NAME, FEATURES } from '@/config/features'

// ─── Changelog (fetched from API) ─────────────────────────────────────────────

interface ChangelogEntry {
  id: number
  version: string
  release_date: string
  changes: string[]
}

async function fetchChangelog(): Promise<ChangelogEntry[]> {
  try {
    const res = await fetch('/api/admin/changelog')
    if (!res.ok) return []
    return res.json() as Promise<ChangelogEntry[]>
  } catch {
    return []
  }
}

// ─── Inline modals ────────────────────────────────────────────────────────────

function ChangelogModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])

  useEffect(() => {
    fetchChangelog().then(setEntries)
  }, [])

  return (
    <Modal isOpen onClose={onClose} title="Notes de version">
      <div className="flex flex-col gap-5 text-sm text-film-text">
        {entries.length === 0 && (
          <p className="text-film-text-dim text-sm text-center">Chargement…</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-film-gold">v{entry.version}</span>
              <span className="text-sm text-film-text-dim">{entry.release_date}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-film-text-dim">
                  <span className="text-film-gold mt-0.5 shrink-0">·</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function FaqModal({ onClose }: { onClose: () => void }) {
  const modeLabel = FEATURES.enableSeries ? 'film ou série' : 'film'
  const dailyLabel = FEATURES.enableSeries
    ? 'Un nouveau défi est disponible chaque jour à minuit, heure de Paris (Europe/Paris).'
    : 'Un nouveau film est disponible chaque jour à minuit, heure de Paris (Europe/Paris).'
  const dataLabel = FEATURES.enableSeries
    ? 'Les données (titre, réalisateur/créateur, acteurs, synopsis) proviennent de The Movie Database (TMDB).'
    : 'Les données (titre, réalisateur, acteurs, synopsis) proviennent de The Movie Database (TMDB).'

  return (
    <Modal isOpen onClose={onClose} title="FAQ">
      <div className="flex flex-col gap-4 text-sm text-film-text">
        <FaqItem
          q="Combien de tentatives ai-je par jour ?"
          a={FEATURES.enableWiki
            ? "Films/Séries : 5 tentatives. Mode Personnalités : 3 tentatives. Chaque mauvaise réponse débloque un indice supplémentaire."
            : "Vous avez 5 tentatives par défi. Chaque mauvaise réponse débloque un indice supplémentaire."}
        />
        <FaqItem
          q={`À quelle heure le nouveau ${modeLabel} apparaît-il ?`}
          a={dailyLabel}
        />
        {FEATURES.enableWiki && (
          <FaqItem
            q="Comment fonctionne le mode Personnalités ?"
            a="Chaque jour, une personnalité à deviner : politicien, sportif, artiste… Son profil (fonctions, clubs, biographie) se dévoile progressivement à chaque erreur. Vous avez 3 tentatives."
          />
        )}
        <FaqItem
          q="Puis-je rejouer les anciens défis ?"
          a="Oui ! Utilisez les flèches ◀ ▶ sous le titre pour naviguer dans les défis passés. Le calendrier (icône 📅) permet de sélectionner une date précise."
        />
        <FaqItem
          q="Mes statistiques sont-elles sauvegardées ?"
          a="Vos statistiques sont sauvegardées localement dans votre navigateur. Elles ne sont pas liées à un compte et disparaissent si vous videz votre cache."
        />
        <FaqItem
          q="Les titres en français et en anglais sont-ils acceptés ?"
          a="Oui, les titres originaux et les titres français sont tous les deux acceptés. Pour le mode Personnalités, les alias courants du nom sont aussi reconnus."
        />
        <FaqItem
          q={`D'où viennent les informations sur les ${FEATURES.enableSeries ? 'films et séries' : 'films'} ?`}
          a={dataLabel}
        />
        {FEATURES.enableWiki && (
          <FaqItem
            q="D'où viennent les données du mode Personnalités ?"
            a="Les biographies et informations de carrière proviennent de Wikipédia et Wikidata, sous licence Creative Commons. Les photos sont issues de Wikimedia Commons."
          />
        )}
      </div>
    </Modal>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="film-border rounded-lg p-3">
      <p className="font-semibold text-film-text mb-1">{q}</p>
      <p className="text-film-text-dim text-sm leading-relaxed">{a}</p>
    </div>
  )
}

function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="Politique de confidentialité">
      <div className="flex flex-col gap-4 text-sm text-film-text-dim leading-relaxed">
        <p>
          <strong className="text-film-text">{BRAND_NAME}</strong> respecte votre vie privée.
          Cette page explique quelles données sont collectées et comment elles sont utilisées.
        </p>

        <section>
          <h3 className="font-semibold text-film-text mb-1">Données collectées</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Un jeton de session anonyme (cookie HTTP-only) pour enregistrer votre progression quotidienne.</li>
            <li>Vos statistiques de jeu (victoires, séries, distribution), stockées uniquement dans votre navigateur (localStorage).</li>
            <li>Des statistiques agrégées anonymes côté serveur (taux de victoire global, sans identification personnelle).</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-film-text mb-1">Ce que nous ne collectons pas</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Aucune donnée personnelle (nom, email, adresse IP stockée durablement).</li>
            <li>Aucun suivi publicitaire ou analytique tiers.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-film-text mb-1">Cookies</h3>
          <p className="text-sm">
            Un seul cookie est utilisé : un jeton de session signé et chiffré, strictement nécessaire au fonctionnement du jeu.
            Il expire après 24 heures.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-film-text mb-1">TMDB</h3>
          <p className="text-sm">
            Les données des films et séries (affiches, synopsis, casting) sont fournies par{' '}
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-film-text">
              The Movie Database (TMDB)
            </a>
            . Votre utilisation de {BRAND_NAME} est soumise aux conditions d'utilisation de TMDB.
          </p>
        </section>

        {FEATURES.enableWiki && (
          <section>
            <h3 className="font-semibold text-film-text mb-1">Sources Wikipédia / Wikidata</h3>
            <p className="text-sm">
              Le mode Personnalités utilise des données issues de{' '}
              <a href="https://fr.wikipedia.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-film-text">Wikipédia</a>
              {' '}et{' '}
              <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-film-text">Wikidata</a>
              , disponibles sous licence{' '}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer" className="underline hover:text-film-text">CC BY-SA 4.0</a>
              . Les photos proviennent de Wikimedia Commons. {BRAND_NAME} n'est pas affilié à la Wikimedia Foundation.
            </p>
          </section>
        )}

        <p className="text-sm italic">
          Dernière mise à jour : mai 2026
        </p>
      </div>
    </Modal>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

type ModalType = 'faq' | 'privacy' | 'changelog' | null

export function Footer() {
  const [modal, setModal] = useState<ModalType>(null)
  const location = useLocation()
  const isGamePage = location.pathname !== '/'

  return (
    <footer className="cdy-footer">
      <div className="cdy-foot-main">
        {/* Colonne brand */}
        <div className="cdy-foot-brand">
          <Link to="/" className="cdy-foot-logo" style={{ textDecoration: 'none' }}>
            <span className="d">🎬</span>
            <span style={{ color: 'var(--ink)' }}>Guess<span style={{ color: 'var(--coral)' }}>Today</span></span>
          </Link>
          <p className="cdy-foot-tag">
            Trois devinettes par jour, le même défi pour tout le monde. Garde ta série en vie et défie tes amis.
          </p>
          <div className="cdy-foot-social">
            <span title="Twitter/X">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h3l-6.6 7.6L22 22h-6.3l-4.9-6.4L5 22H2l7-8.1L2 2h6.4l4.5 5.9L18 2zm-1.1 18h1.7L7.2 3.8H5.4L16.9 20z" /></svg>
            </span>
            <span title="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
            </span>
            <span title="TikTok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9v2.4c-1.3.1-2.5-.3-3.5-1v5.6a5.4 5.4 0 1 1-5.4-5.4c.2 0 .4 0 .6.05v2.5a2.9 2.9 0 1 0 2 2.75V3h2.8z" /></svg>
            </span>
          </div>
        </div>

        {/* Colonnes de liens */}
        <div className="cdy-foot-cols">
          <div className="cdy-foot-col">
            <h5>Les jeux</h5>
            <Link to="/films">FilmGuess</Link>
            {FEATURES.enableSeries && <Link to="/series">SerieGuess</Link>}
            {FEATURES.enableWiki && <Link to="/wiki">FaceGuess</Link>}
            <Link to="/">Défi du jour</Link>
          </div>
          <div className="cdy-foot-col">
            <h5>Découvrir</h5>
            <button type="button" onClick={() => setModal('faq')}>FAQ</button>
            <Link to="/friends">Classement</Link>
            <Link to="/friends">Amis</Link>
          </div>
          <div className="cdy-foot-col">
            <h5>GuessToday</h5>
            <button type="button" onClick={() => setModal('privacy')}>Confidentialité</button>
            <button type="button" onClick={() => setModal('changelog')}>Notes de version</button>
            {isGamePage && (
              <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
                Données TMDB
              </a>
            )}
            {FEATURES.enableWiki && isGamePage && (
              <a href="https://www.wikipedia.org" target="_blank" rel="noopener noreferrer">
                Données Wikipedia
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="cdy-foot-bottom">
        <span>© {new Date().getFullYear()} {BRAND_NAME} · Fait avec 🧡 à Paris</span>
      </div>

      {modal === 'faq'       && <FaqModal       onClose={() => setModal(null)} />}
      {modal === 'privacy'   && <PrivacyModal   onClose={() => setModal(null)} />}
      {modal === 'changelog' && <ChangelogModal onClose={() => setModal(null)} />}
    </footer>
  )
}
