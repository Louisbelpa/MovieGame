/**
 * layout/Footer.tsx
 * Site footer with legal links, contact and TMDB attribution.
 */

import { useState, useEffect } from 'react'
import { ExternalLink, Film } from 'lucide-react'
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
          <p className="text-film-text-dim text-xs text-center">Chargement…</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-film-gold">v{entry.version}</span>
              <span className="text-xs text-film-text-dim">{entry.release_date}</span>
            </div>
            <ul className="flex flex-col gap-1">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-film-text-dim">
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
          a="Vous avez 5 tentatives par défi. Chaque mauvaise réponse débloque un indice supplémentaire."
        />
        <FaqItem
          q={`À quelle heure le nouveau ${modeLabel} apparaît-il ?`}
          a={dailyLabel}
        />
        <FaqItem
          q="Puis-je rejouer les anciens défis ?"
          a="Oui ! Utilisez les flèches ◀ ▶ sous le titre pour naviguer dans les défis passés."
        />
        <FaqItem
          q="Mes statistiques sont-elles sauvegardées ?"
          a="Vos statistiques sont sauvegardées localement dans votre navigateur. Elles ne sont pas liées à un compte et disparaissent si vous videz votre cache."
        />
        <FaqItem
          q="Les titres en français et en anglais sont-ils acceptés ?"
          a="Oui, les titres originaux et les titres français sont tous les deux acceptés."
        />
        <FaqItem
          q={`D'où viennent les informations sur les ${FEATURES.enableSeries ? 'films et séries' : 'films'} ?`}
          a={dataLabel}
        />
      </div>
    </Modal>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="film-border rounded-lg p-3">
      <p className="font-semibold text-film-text mb-1">{q}</p>
      <p className="text-film-text-dim text-xs leading-relaxed">{a}</p>
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
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Un jeton de session anonyme (cookie HTTP-only) pour enregistrer votre progression quotidienne.</li>
            <li>Vos statistiques de jeu (victoires, séries, distribution), stockées uniquement dans votre navigateur (localStorage).</li>
            <li>Des statistiques agrégées anonymes côté serveur (taux de victoire global, sans identification personnelle).</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-film-text mb-1">Ce que nous ne collectons pas</h3>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Aucune donnée personnelle (nom, email, adresse IP stockée durablement).</li>
            <li>Aucun suivi publicitaire ou analytique tiers.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-film-text mb-1">Cookies</h3>
          <p className="text-xs">
            Un seul cookie est utilisé : un jeton de session signé et chiffré, strictement nécessaire au fonctionnement du jeu.
            Il expire après 24 heures.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-film-text mb-1">TMDB</h3>
          <p className="text-xs">
            Les données des films (affiches, synopsis, casting) sont fournies par{' '}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-film-text"
            >
              The Movie Database (TMDB)
            </a>
            . Votre utilisation de {BRAND_NAME} est soumise aux conditions d'utilisation de TMDB.
          </p>
        </section>

        <p className="text-xs italic">
          Dernière mise à jour : janvier 2026
        </p>
      </div>
    </Modal>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

type ModalType = 'faq' | 'privacy' | 'changelog' | null

export function Footer() {
  const [modal, setModal] = useState<ModalType>(null)

  return (
    <>
      <footer className="mt-auto border-t border-film-border/50 bg-film-black">
        <div className="max-w-2xl mx-auto px-4 py-5">
          {/* Links row */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-film-text-dim mb-4">
            <button
              onClick={() => setModal('faq')}
              className="hover:text-film-text transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <button
              onClick={() => setModal('privacy')}
              className="hover:text-film-text transition-colors cursor-pointer"
            >
              Politique de confidentialité
            </button>
            <a
              href="mailto:contact@cineguessr.fr"
              className="flex items-center gap-1.5 hover:text-film-text transition-colors"
            >
              <ExternalLink size={12} />
              Contact
            </a>
          </div>

          {/* TMDB attribution */}
          <div className="flex items-center justify-center gap-2 mb-3 text-[10px] text-film-text-dim/60">
            <Film size={11} />
            <span>
              Ce produit utilise l'API TMDB mais n'est pas approuvé ou certifié par{' '}
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-film-text-dim transition-colors"
              >
                TMDB
              </a>
              .
            </span>
          </div>

          {/* Copyright + version */}
          <div className="flex items-center justify-center gap-3 text-[10px] text-film-text-dim/50">
            <p>© {new Date().getFullYear()} {BRAND_NAME}. Tous droits réservés.</p>
            <button
              onClick={() => setModal('changelog')}
              className="hover:text-film-text-dim transition-colors cursor-pointer"
            >
              v{__APP_VERSION__}
            </button>
          </div>
        </div>
      </footer>

      {modal === 'faq' && <FaqModal onClose={() => setModal(null)} />}
      {modal === 'privacy' && <PrivacyModal onClose={() => setModal(null)} />}
      {modal === 'changelog' && <ChangelogModal onClose={() => setModal(null)} />}
    </>
  )
}
