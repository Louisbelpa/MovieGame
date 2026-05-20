import { useEffect, useRef, useState } from 'react'
import { PALETTES, applyPalette, getSavedPaletteId, savePaletteId } from '@/config/palettes'
import type { Palette } from '@/config/palettes'
import { useUiPrefsStore } from '@/store/uiPrefsStore'

export function PalettePicker() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(() => getSavedPaletteId())
  const panelRef = useRef<HTMLDivElement>(null)
  const newDesign = useUiPrefsStore((s) => s.newDesign)
  const toggleNewDesign = useUiPrefsStore((s) => s.toggleNewDesign)

  // Apply palette on mount
  useEffect(() => {
    const saved = getSavedPaletteId()
    const palette = PALETTES.find((p) => p.id === saved) ?? PALETTES[0]
    applyPalette(palette)
    setActiveId(palette.id)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function select(palette: Palette) {
    applyPalette(palette)
    savePaletteId(palette.id)
    setActiveId(palette.id)
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        bottom: '76px',
        left: '16px',
        zIndex: 9999,
        fontFamily: 'var(--font-body, Inter, system-ui, sans-serif)',
      }}
    >
      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            width: '260px',
            background: 'color-mix(in srgb, var(--color-film-black) 92%, transparent)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--color-film-border)',
            borderRadius: '16px',
            padding: '12px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          }}
        >
          {/* New design toggle */}
          <button
            onClick={toggleNewDesign}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 10px',
              borderRadius: '10px',
              border: '1px solid var(--color-film-border)',
              background: 'var(--color-film-surface)',
              cursor: 'pointer',
              marginBottom: '10px',
            }}
          >
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-film-text)' }}>
              Nouveau design
            </span>
            {/* Toggle switch */}
            <div
              style={{
                width: '34px',
                height: '18px',
                borderRadius: '999px',
                background: newDesign ? 'var(--color-film-gold)' : 'var(--color-film-gray)',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: newDesign ? '18px' : '2px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
            </div>
          </button>

          <p
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '9px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-film-text-dim)',
              margin: '0 0 10px 4px',
            }}
          >
            Palette
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {PALETTES.map((palette) => {
              const isActive = palette.id === activeId
              return (
                <button
                  key={palette.id}
                  onClick={() => select(palette)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: isActive
                      ? `1px solid ${palette.films}55`
                      : '1px solid transparent',
                    background: isActive
                      ? `${palette.films}12`
                      : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLElement).style.background =
                        'var(--color-film-surface)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    }
                  }}
                >
                  {/* Swatches */}
                  <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: palette.films,
                      }}
                    />
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: palette.series,
                      }}
                    />
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: palette.wiki,
                      }}
                    />
                  </div>

                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: isActive
                          ? palette.films
                          : 'var(--color-film-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {palette.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '9px',
                        letterSpacing: '0.10em',
                        color: 'var(--color-film-text-dim)',
                        marginTop: '1px',
                      }}
                    >
                      {palette.num} · {palette.vibe}
                    </div>
                  </div>

                  {/* Check */}
                  {isActive && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="8" cy="8" r="7" fill={palette.films} />
                      <path
                        d="M4.5 8l2.5 2.5 4.5-4.5"
                        stroke={palette.dark ? '#000' : '#fff'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Changer de palette"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid var(--color-film-border)',
          background: open
            ? 'var(--color-film-surface)'
            : 'color-mix(in srgb, var(--color-film-black) 85%, transparent)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          transition: 'background 0.15s, transform 0.15s',
          transform: open ? 'scale(1.05)' : 'scale(1)',
        }}
      >
        <PaletteIcon color="var(--color-film-gold)" />
      </button>
    </div>
  )
}

function PaletteIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z"
        fill={color}
        opacity="0.9"
      />
      <circle cx="6.5" cy="11.5" r="1.5" fill="var(--color-film-black)" />
      <circle cx="9.5" cy="7.5" r="1.5" fill="var(--color-film-black)" />
      <circle cx="14.5" cy="7.5" r="1.5" fill="var(--color-film-black)" />
      <circle cx="17.5" cy="11.5" r="1.5" fill="var(--color-film-black)" />
    </svg>
  )
}
