import { motion } from 'framer-motion'
import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WikiChallengeImageProps {
  imageUrl: string | null
  isRevealed: boolean
  className?: string
}

export function WikiChallengeImage({ imageUrl, isRevealed, className }: WikiChallengeImageProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-film-black motion-safe:transition-[max-height] duration-500 ease-out',
        isRevealed
          ? 'max-h-[45vh] sm:max-h-[52vh]'
          : 'h-[130px] sm:h-[160px]',
        className
      )}
      style={{
        border: '1px solid var(--mode-ring)',
        boxShadow: '0 0 0 4px var(--mode-soft)',
      }}
    >
      {imageUrl ? (
        <>
          <motion.img
            key={imageUrl}
            src={imageUrl}
            alt={isRevealed ? 'Portrait de la personnalité à deviner' : 'Ambiance visuelle (indice non exploitable)'}
            className={cn(
              'w-full h-full',
          isRevealed ? 'object-contain object-center' : 'object-cover object-center',
              'scale-[1.12] motion-safe:transition-[filter,transform] duration-500 ease-out',
              isRevealed
                ? 'blur-0 grayscale-0 brightness-100 contrast-100 scale-100'
                : 'blur-[38px] sm:blur-[46px] saturate-[0.38] brightness-[0.78] contrast-[0.82]'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
            draggable={false}
          />
          {!isRevealed && (
            <div
              className={cn(
                'absolute inset-0 pointer-events-none motion-safe:transition-opacity duration-500',
                'bg-[radial-gradient(ellipse_95%_90%_at_50%_42%,transparent_0%,rgb(0_0_0/0.12)_55%,rgb(0_0_0/0.28)_100%)]'
              )}
              aria-hidden
            />
          )}
        </>
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          role="img"
          aria-label="Aucune photo pour cet indice visuel"
        >
          <UserRound size={56} className="text-film-muted" strokeWidth={1.25} aria-hidden />
          <p className="text-film-text-dim text-sm text-center px-4">Pas de portrait pour ce défi</p>
        </div>
      )}
    </div>
  )
}
