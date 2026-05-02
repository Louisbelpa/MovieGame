import { BookOpen, Briefcase, Trophy, Lock, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useWikiStore } from '@/store/wikiStore'

const RULES_SEEN_KEY = 'cineguess:rules_seen:wiki'

export function WikiRulesModal() {
  const isOpen = useWikiStore((s) => s.ui.isModalOpen && s.ui.modalType === 'rules')
  const closeModal = useWikiStore((s) => s.closeModal)

  function handleClose() {
    try { localStorage.setItem(RULES_SEEN_KEY, '1') } catch {}
    closeModal()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Comment jouer ?">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-film-gold/15 border border-film-gold/30 flex items-center justify-center shrink-0" aria-hidden>
            <BookOpen size={20} className="text-film-gold" />
          </div>
          <p className="text-xs text-film-text-dim">WikiGuessr — Devine la personnalité</p>
        </div>

        <div className="flex flex-col gap-3 text-sm text-film-text">
          <p>Chaque jour, une nouvelle personnalité à deviner — politicien, sportif ou autre.</p>

          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-3 p-3 rounded-lg film-border">
              <Briefcase size={16} className="text-film-gold mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Pour les politiciens</p>
                <p className="text-film-text-dim text-xs mt-0.5">Les fonctions s'affichent progressivement : d'abord les titres seuls, puis les dates, les pays, les prédécesseurs…</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg film-border">
              <Trophy size={16} className="text-film-gold mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Pour les sportifs</p>
                <p className="text-film-text-dim text-xs mt-0.5">La carrière se dévoile peu à peu : noms des clubs, années, statistiques, équipe nationale…</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg film-border">
              <Lock size={16} className="text-film-gold mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Indices progressifs</p>
                <p className="text-film-text-dim text-xs mt-0.5">Un nouvel indice se débloque à chaque mauvaise réponse. Moins vous utilisez d'indices, mieux c'est !</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg film-border">
              <CheckCircle2 size={16} className="text-film-gold mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Vous avez 3 tentatives</p>
                <p className="text-film-text-dim text-xs mt-0.5">Entrez le nom de la personnalité ou choisissez dans l'autocomplétion. Vous pouvez passer une tentative pour débloquer un indice.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg film-border">
              <p className="font-medium text-xs mb-2">Signification des pastilles</p>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-film-green flex items-center justify-center text-film-black font-bold text-[10px]">✓</span>
                  <span className="text-film-text">Correct</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-film-red flex items-center justify-center text-white font-bold text-[10px]">✗</span>
                  <span className="text-film-text">Incorrect</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-film-border/60 flex items-center justify-center text-film-text-dim text-[10px]">→</span>
                  <span className="text-film-text">Passé</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <Button variant="primary" size="md" onClick={handleClose} className="w-full">
          C'est parti !
        </Button>
      </div>
    </Modal>
  )
}
