/**
 * WikiApp.tsx
 * Entry point for the /wiki route — Wikipedia person-guessing game.
 */

import { useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import { WikiGamePage } from '@/components/wiki/WikiGamePage'
import { RulesModal } from '@/components/modals/RulesModal'
import { ArchiveModal } from '@/components/modals/ArchiveModal'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { RULES_SEEN_KEY_WIKI } from '@/lib/rulesSeen'
import { useWikiStore } from '@/store/wikiStore'

export function WikiApp() {
  const openModal = useWikiStore((s) => s.openModal)

  // Show rules modal on first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem(RULES_SEEN_KEY_WIKI)) {
        openModal('rules')
      }
    } catch {}
  }, [openModal])

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen flex flex-col bg-film-black text-film-text">
      <Header mode="wiki" />
      <main id="main-content" className="flex-1">
        <WikiGamePage />
      </main>
      <Footer />

      <RulesModal mode="wiki" />
      <ArchiveModal mode="wiki" />
    </div>
    </MotionConfig>
  )
}
