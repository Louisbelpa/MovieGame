/**
 * WikiApp.tsx
 * Entry point for the /wiki route — Wikipedia person-guessing game.
 */

import { useEffect } from 'react'
import { WikiGamePage } from '@/components/wiki/WikiGamePage'
import { RulesModal } from '@/components/modals/RulesModal'
import { ArchiveModal } from '@/components/modals/ArchiveModal'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { useWikiStore } from '@/store/wikiStore'

const RULES_SEEN_KEY = 'cineguess:rules_seen:wiki'

export function WikiApp() {
  const openModal = useWikiStore((s) => s.openModal)

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
      <Header mode="wiki" />
      <main className="flex-1">
        <WikiGamePage />
      </main>
      <Footer />

      <RulesModal mode="wiki" />
      <ArchiveModal mode="wiki" />
    </div>
  )
}
