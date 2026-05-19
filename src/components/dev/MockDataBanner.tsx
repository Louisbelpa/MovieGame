/**
 * MockDataBanner.tsx
 * Pill flottant visible uniquement sur staging pour activer/désactiver les données mockées.
 * Active un compte fictif complet (user + stats + amis) sans appel réseau.
 */

import { useState, useEffect } from 'react'
import { IS_STAGING, isMockEnabled, setMockEnabled } from '@/mock/mockFlags'
import { MOCK_USER, MOCK_SERVER_STATS } from '@/mock/mockData'
import { useAuthStore } from '@/store/authStore'

export function MockDataBanner() {
  const [enabled, setEnabled] = useState(false)
  const { fetchMe } = useAuthStore()

  // Sync with localStorage on mount
  useEffect(() => {
    if (IS_STAGING) setEnabled(isMockEnabled())
  }, [])

  if (!IS_STAGING) return null

  const toggle = async () => {
    const next = !enabled
    setMockEnabled(next)
    setEnabled(next)

    if (next) {
      // Injecte directement user + stats dans le store — aucun appel réseau
      useAuthStore.setState({
        user: MOCK_USER,
        serverStats: MOCK_SERVER_STATS,
        isLoading: false,
      })
    } else {
      // Revenir aux vraies données
      await fetchMe()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px 6px 10px',
        borderRadius: 999,
        background: enabled ? 'rgba(167,139,250,0.18)' : 'rgba(255,255,255,0.07)',
        border: `1px solid ${enabled ? 'rgba(167,139,250,0.45)' : 'rgba(255,255,255,0.12)'}`,
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.2s',
        fontSize: 12,
        fontWeight: 600,
        color: enabled ? '#a78bfa' : 'rgba(236,233,226,0.5)',
        boxShadow: enabled ? '0 0 0 3px rgba(167,139,250,0.12)' : 'none',
      }}
      onClick={toggle}
      title={enabled ? 'Désactiver les données mockées' : 'Activer les données mockées'}
    >
      {/* Indicator dot */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: enabled ? '#a78bfa' : 'rgba(255,255,255,0.25)',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
      />
      {enabled ? 'Mock ON' : 'Mock'}
    </div>
  )
}
