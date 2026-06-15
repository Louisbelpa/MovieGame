/* GuessToday — Design System overview screen */
function DSView() {
  const Swatch = ({ name, varName, hex }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ height: 72, borderRadius: 'var(--gt-r-md)', background: `var(${varName})`, border: '1px solid var(--gt-line)' }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
        <div className="gt-mono" style={{ fontSize: 11, color: 'var(--gt-text-3)' }}>{varName}</div>
      </div>
    </div>
  );
  const Block = ({ title, children, note }) => (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ borderBottom: '1px solid var(--gt-line)', paddingBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h2>
        {note && <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--gt-text-3)' }}>{note}</p>}
      </div>
      {children}
    </section>
  );

  return (
    <div className="gt-root" style={{ width: 1440, minHeight: 1700, padding: '56px 64px 80px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
        <div>
          <GTBadge tone="accent" style={{ marginBottom: 14 }}>Design System v1.0</GTBadge>
          <h1 style={{ margin: 0, fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em' }}>GuessToday — Système de design</h1>
          <p style={{ margin: '10px 0 0', fontSize: 16, color: 'var(--gt-text-2)', maxWidth: 640 }}>
            Dark mode premium, accents par jeu harmonisés en oklch. Pensé pour s'étendre : ajouter un jeu = ajouter une teinte au même niveau de luminosité.
          </p>
        </div>
        <GTLogo size={32} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
        {/* Logo */}
        <Block title="Logotype" note="Orthographe stricte : « GuessToday », sans tréma. Mark = dé arrondi avec « ? ». « Today » prend la couleur de marque.">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 36, display: 'grid', placeItems: 'center' }}>
              <GTLogo size={36} />
            </div>
            <div style={{ flex: 1, minWidth: 260, background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 36, display: 'grid', placeItems: 'center' }}>
              <GTLogo size={28} mark={false} />
            </div>
            <div style={{ flex: '0 0 auto', width: 120, background: 'var(--gt-brand)', borderRadius: 'var(--gt-r-lg)', padding: 36, display: 'grid', placeItems: 'center' }}>
              <span style={{ color: 'var(--gt-bg)', fontWeight: 700, fontSize: 56, fontFamily: 'var(--gt-sans)' }}>?</span>
            </div>
          </div>
        </Block>

        {/* Colors */}
        <Block title="Couleurs — surfaces" note="Noir profond neutre, très légère teinte froide. Élévation par paliers de luminosité.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 18 }}>
            <Swatch name="Background" varName="--gt-bg" />
            <Swatch name="BG 2" varName="--gt-bg-2" />
            <Swatch name="Surface" varName="--gt-surface" />
            <Swatch name="Surface 2" varName="--gt-surface-2" />
            <Swatch name="Surface 3" varName="--gt-surface-3" />
            <Swatch name="Line" varName="--gt-line-2" />
          </div>
        </Block>

        <Block title="Couleurs — accents par jeu" note="L = 0.78–0.82, C ≈ 0.15 constant, seule la teinte (hue) change. Système ouvert : 3 jeux aujourd'hui, prêt pour 6, 8…">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 18 }}>
            <Swatch name="FilmGuess · doré" varName="--gt-film" />
            <Swatch name="SerieGuess · violet" varName="--gt-serie" />
            <Swatch name="FaceGuess · cyan" varName="--gt-face" />
            <Swatch name="Jeu 4 · vert" varName="--gt-game-4" />
            <Swatch name="Réserve · corail" varName="--gt-game-5" />
            <Swatch name="Réserve · indigo" varName="--gt-game-6" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            <Swatch name="Succès" varName="--gt-correct" />
            <Swatch name="Échec" varName="--gt-wrong" />
            <Swatch name="Alerte" varName="--gt-warn" />
            <Swatch name="Texte" varName="--gt-text" />
          </div>
        </Block>

        {/* Type */}
        <Block title="Typographie" note="Space Grotesk (titres, UI) · JetBrains Mono (scores, compteurs, partage).">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--gt-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Space Grotesk</div>
              <div style={{ fontWeight: 700, fontSize: 40, letterSpacing: '-0.02em' }}>Trouve le film du jour</div>
              <div style={{ fontWeight: 600, fontSize: 24 }}>Titre de section</div>
              <div style={{ fontSize: 16, color: 'var(--gt-text-2)' }}>Corps de texte — 5 tentatives, 3 indices, un nouveau défi chaque jour à minuit.</div>
            </div>
            <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--gt-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>JetBrains Mono</div>
              <div className="gt-mono" style={{ fontWeight: 700, fontSize: 48, color: 'var(--gt-film)' }}>3/5</div>
              <div className="gt-mono" style={{ fontSize: 22 }}>#142 · 28.05.2026</div>
              <div className="gt-mono" style={{ fontSize: 16, color: 'var(--gt-text-2)' }}>streak 12 · score 87% · rang #3</div>
            </div>
          </div>
        </Block>

        {/* Components */}
        <Block title="Composants" note="Tous nommés sous la marque : GTButton, GTGameCard, GTBadge, GTStreak, GTAttemptRow…">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* buttons + badges */}
            <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-2)' }}>Boutons</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <GTButton variant="primary">Primaire</GTButton>
                <GTButton variant="ghost">Ghost</GTButton>
                <GTButton variant="soft">Soft</GTButton>
                <GTButton variant="danger">Danger</GTButton>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-2)', marginTop: 6 }}>Badges & statuts</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <GTBadge>Neutre</GTBadge>
                <GTBadge tone="success">✓ Gagné</GTBadge>
                <GTBadge tone="danger">✕ Perdu</GTBadge>
                <GTBadge tone="warn">En cours</GTBadge>
                <GTStreak days={12} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-2)', marginTop: 6 }}>Champ de saisie + autocomplétion</div>
              <GTGuessInput value="Inter" suggestions={[{ title: 'Interstellar', meta: '2014 · Sci-Fi' }, { title: 'Internal Affairs', meta: '1990 · Thriller' }]} />
            </div>
            {/* game card */}
            <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-2)' }}>Game card — composant générique extensible</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <GTGameCard game="film" status="todo" compact />
                <GTGameCard game="serie" status="progress" attempts={2} compact />
              </div>
            </div>
          </div>
          {/* attempt grid + hints + share */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }}>
            <div className="gt-film" style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-2)' }}>Grille de tentatives + indices</div>
              <GTAttemptGrid rows={[
                { state: 'wrong', text: 'Inception' },
                { state: 'skip', text: 'Essai passé' },
                { state: 'correct', text: 'Interstellar' },
              ]} total={5} />
              <div style={{ display: 'flex', gap: 10 }}>
                <GTHintCard index={1} label="Année" value="2014" revealed />
                <GTHintCard index={2} label="Acteur" value="M. McConaughey" revealed />
                <GTHintCard index={3} revealed={false} />
              </div>
            </div>
            <div style={{ background: 'var(--gt-surface)', border: '1px solid var(--gt-line)', borderRadius: 'var(--gt-r-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gt-text-2)', alignSelf: 'flex-start' }}>Carte de partage (sans spoiler)</div>
              <GTShareCard game="film" won attempts={3} hintsUsed={2} width={320} />
            </div>
          </div>
        </Block>

        {/* Spacing / radii */}
        <Block title="Rayons & espacement" note="Échelle 4 → 64px. Rayons sm 8 · md 14 · lg 20 · xl 28 · pill.">
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
            {[['sm', 8], ['md', 14], ['lg', 20], ['xl', 28]].map(([n, r]) => (
              <div key={n} style={{ textAlign: 'center' }}>
                <div style={{ width: 84, height: 84, background: 'var(--gt-surface-2)', border: '1px solid var(--gt-line-2)', borderRadius: r }} />
                <div className="gt-mono" style={{ fontSize: 11, color: 'var(--gt-text-3)', marginTop: 8 }}>{n} · {r}px</div>
              </div>
            ))}
          </div>
        </Block>
      </div>
    </div>
  );
}
Object.assign(window, { DSView });
