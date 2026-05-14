/**
 * EmailVerificationBanner.tsx
 * Dismissable amber banner shown when email is unverified.
 */

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authSendVerificationEmail } from '@/api/client'

export function EmailVerificationBanner() {
  const user = useAuthStore((s) => s.user)
  const [dismissed, setDismissed] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  if (!user || user.emailVerified !== false || dismissed) return null

  async function handleResend() {
    if (cooldown > 0) return
    try {
      await authSendVerificationEmail()
      setSent(true)
      setCooldown(60)
      const iv = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) { clearInterval(iv); return 0 }
          return prev - 1
        })
      }, 1000)
      setTimeout(() => setSent(false), 3000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="w-full bg-amber-950/60 border-b border-amber-800/40 px-4 py-2.5">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" aria-hidden />
        <p className="flex-1 text-sm text-amber-200">
          Confirmez votre email pour protéger votre compte.
        </p>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={cooldown > 0}
          className="text-sm font-medium text-amber-300 hover:text-amber-100 disabled:opacity-50 cursor-pointer disabled:cursor-default whitespace-nowrap transition-colors"
        >
          {sent ? 'Email envoyé !' : cooldown > 0 ? `Renvoyer (${cooldown}s)` : 'Renvoyer'}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          className="text-amber-400/60 hover:text-amber-300 cursor-pointer transition-colors flex-shrink-0"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  )
}
