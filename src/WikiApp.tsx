/**
 * WikiApp.tsx
 * Entry point for the /wiki route — Wikipedia person-guessing game.
 */

import { useEffect } from 'react'
import { WikiGamePage } from '@/components/wiki/WikiGamePage'
import { WikiWinModal } from '@/components/wiki/WikiWinModal'
import { WikiLoseModal } from '@/components/wiki/WikiLoseModal'
import { WikiRulesModal } from '@/components/wiki/WikiRulesModal'
import { WikiStatsModal } from '@/components/wiki/WikiStatsModal'
import { WikiArchiveModal } from '@/components/wiki/WikiArchiveModal'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useWikiStore } from '@/store/wikiStore'

const RULES_SEEN_KEY = 'cineguess:rules_seen:wiki'

export function WikiApp() {
  const openModal = useWikiStore((s) => s.openModal)
  const status = useWikiStore((s) => s.status)

  // Show rules modal on first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem(RULES_SEEN_KEY)) {
        openModal('rules')
      }
    } catch {}
  }, [openModal])

  return (
    <div className="min-h-screen flex flex-col bg-film-black text-film-text">
      <Header />
      <main className="flex-1">
        <WikiGamePage />
      </main>
      <Footer />

      {/* Modals — rendered at root to avoid z-index issues */}
      {status !== 'idle' && (
        <>
          <WikiWinModal />
          <WikiLoseModal />
        </>
      )}
      <WikiRulesModal />
      <WikiStatsModal />
      <WikiArchiveModal />
    </div>
  )
}
