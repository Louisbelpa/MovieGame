import SwiftUI

enum Theme {
    // MARK: - Candy surfaces & ink
    static let bg           = Color(hex: "#fff4ea")  // --bg (crème)
    static let bg2          = Color(hex: "#ffefe1")  // --bg-2
    static let panel        = Color(hex: "#ffffff")  // --panel (cartes)
    static let ink          = Color(hex: "#3c3050")  // --ink (texte principal, prune)
    static let ink2         = Color(hex: "#9a8ca5")  // --ink-2
    static let ink3         = Color(hex: "#bcaec3")  // --ink-3 (placeholder)
    static let line         = Color(hex: "#f0e3d6")  // --line (bordures)
    static let line2        = Color(hex: "#ecd9c7")  // --line-2 (ombres dures neutres)

    // MARK: - Semantic
    static let correct      = Color(hex: "#27c08a")
    static let correctDark  = Color(hex: "#159468")
    static let correctSoft  = Color(hex: "#d6f6ea")
    static let wrong        = Color(hex: "#ff6b81")
    static let wrongDark    = Color(hex: "#e0445d")
    static let wrongSoft    = Color(hex: "#ffe3e7")
    static let flame        = Color(hex: "#ff9436")
    static let flameSoft    = Color(hex: "#fff5e6")
    static let sun          = Color(hex: "#ffce4a")
    static let sunDark      = Color(hex: "#e0a91f")

    // MARK: - Per-game accents
    static let coral        = Color(hex: "#ff7a4d")
    static let coralDark    = Color(hex: "#d6582e")
    static let coralSoft    = Color(hex: "#ffe7dd")
    static let grape        = Color(hex: "#9b6cff")
    static let grapeDark    = Color(hex: "#7a4ae0")
    static let grapeSoft    = Color(hex: "#ece1ff")
    static let sky          = Color(hex: "#3bb6f5")
    static let skyDark      = Color(hex: "#1f93d6")
    static let skySoft      = Color(hex: "#dcf1ff")

    // MARK: - Backward-compatible aliases (anciens noms → tokens Candy)
    static let background   = bg
    static let surface      = panel
    static let surfaceAlt   = Color(hex: "#fffaf4")
    static let border       = line
    static let muted        = line2
    static let text         = ink
    static let textDim      = ink2
    static let gold         = coral         // film accent
    static let goldLight    = Color(hex: "#ffa07a")
    static let green        = correct
    static let red          = wrong
    static let amber        = flame
    static let modeFilm     = coral
    static let modeSeries   = grape
    static let modeWiki     = sky
    static let primaryButtonFg = Color.white  // texte blanc sur accent

    static let goldGradient = LinearGradient(
        colors: [Color(hex: "#ff8a5d"), Color(hex: "#ff6a3a")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: - Typography (Fredoka → SF Rounded, JetBrains Mono → monospaced système)
    /// Titres / display (arrondi, gras).
    static func fraunces(size: CGFloat, italic: Bool = false) -> Font {
        .system(size: size, weight: .semibold, design: .rounded)
    }
    /// Corps / UI (arrondi).
    static func inter(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }
    /// Chiffres / dates / labels mono (tabular).
    static func mono(size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }

    // MARK: - Spacing
    static let spacing4: CGFloat  = 4
    static let spacing8: CGFloat  = 8
    static let spacing12: CGFloat = 12
    static let spacing14: CGFloat = 14
    static let spacing16: CGFloat = 16
    static let spacing20: CGFloat = 20
    static let spacing24: CGFloat = 24
    static let spacing28: CGFloat = 28

    // MARK: - Corner radius (Candy : plus généreux)
    static let radiusS: CGFloat   = 12
    static let radiusM: CGFloat   = 16
    static let radiusL: CGFloat   = 22
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int = UInt64(0)
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:(a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r)/255, green: Double(g)/255, blue: Double(b)/255, opacity: Double(a)/255)
    }
}

// MARK: - Profondeur 3D Candy (ombres dures décalées, blur 0)

/// Carte Candy : fond panel, bordure 2.5px, ombre dure décalée vers le bas.
struct CandyCard: ViewModifier {
    var radius: CGFloat = Theme.radiusL
    var fill: Color = Theme.panel
    var border: Color = Theme.line
    var shadow: Color = Theme.line2
    var depth: CGFloat = 6
    var borderWidth: CGFloat = 2.5

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(fill)
                    .overlay(
                        RoundedRectangle(cornerRadius: radius, style: .continuous)
                            .strokeBorder(border, lineWidth: borderWidth)
                    )
                    .background(
                        RoundedRectangle(cornerRadius: radius, style: .continuous)
                            .fill(shadow)
                            .offset(y: depth)
                    )
            )
    }
}

extension View {
    func candyCard(
        radius: CGFloat = Theme.radiusL,
        fill: Color = Theme.panel,
        border: Color = Theme.line,
        shadow: Color = Theme.line2,
        depth: CGFloat = 6
    ) -> some View {
        modifier(CandyCard(radius: radius, fill: fill, border: border, shadow: shadow, depth: depth))
    }
}

/// Bouton plein avec enfoncement physique (ombre dure → réduite à l'appui).
struct CandyButtonStyle: ButtonStyle {
    var accent: Color = Theme.coral
    var accentDark: Color = Theme.coralDark
    var radius: CGFloat = 15
    var depth: CGFloat = 6
    var fontSize: CGFloat = 16

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        let off: CGFloat = pressed ? depth - 2 : 0
        return configuration.label
            .font(.system(size: fontSize, weight: .semibold, design: .rounded))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(accent)
                    .background(
                        RoundedRectangle(cornerRadius: radius, style: .continuous)
                            .fill(accentDark)
                            .offset(y: pressed ? 2 : depth)
                    )
            )
            .offset(y: off)
            .animation(.easeOut(duration: 0.08), value: pressed)
    }
}

/// Bouton « soft » (fond blanc, bordure, ombre neutre).
struct CandySoftButtonStyle: ButtonStyle {
    var radius: CGFloat = 15
    var depth: CGFloat = 5
    var fontSize: CGFloat = 15

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        return configuration.label
            .font(.system(size: fontSize, weight: .semibold, design: .rounded))
            .foregroundColor(Theme.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(
                RoundedRectangle(cornerRadius: radius, style: .continuous)
                    .fill(Theme.panel)
                    .overlay(RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(Theme.line, lineWidth: 2.5))
                    .background(
                        RoundedRectangle(cornerRadius: radius, style: .continuous)
                            .fill(Theme.line2)
                            .offset(y: pressed ? 2 : depth)
                    )
            )
            .offset(y: pressed ? depth - 2 : 0)
            .animation(.easeOut(duration: 0.08), value: pressed)
    }
}

// MARK: - Glyphe de jeu (pastille accent + icône)

struct GameGlyph: View {
    let mode: GameMode
    var size: CGFloat = 40
    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
            .fill(mode.color)
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: mode.iconFilled)
                    .font(.system(size: size * 0.5, weight: .bold))
                    .foregroundColor(.white)
            )
            .background(
                RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
                    .fill(mode.accentDark)
                    .offset(y: 3)
            )
    }
}

// MARK: - ViewModifiers (rétro-compat, restylés Candy)

struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content.candyCard(radius: Theme.radiusM)
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var isLoading: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        return HStack(spacing: 8) {
            if isLoading { ProgressView().tint(.white) }
            configuration.label
        }
        .font(.system(size: 16, weight: .semibold, design: .rounded))
        .foregroundColor(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 15, style: .continuous)
                .fill(Theme.coral)
                .background(
                    RoundedRectangle(cornerRadius: 15, style: .continuous)
                        .fill(Theme.coralDark)
                        .offset(y: pressed ? 2 : 6)
                )
        )
        .offset(y: pressed ? 4 : 0)
        .animation(.easeOut(duration: 0.08), value: pressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        let pressed = configuration.isPressed
        return configuration.label
            .font(.system(size: 15, weight: .semibold, design: .rounded))
            .foregroundColor(Theme.ink)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .background(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .fill(Theme.panel)
                    .overlay(RoundedRectangle(cornerRadius: 15, style: .continuous).strokeBorder(Theme.line, lineWidth: 2.5))
                    .background(
                        RoundedRectangle(cornerRadius: 15, style: .continuous)
                            .fill(Theme.line2)
                            .offset(y: pressed ? 2 : 5)
                    )
            )
            .offset(y: pressed ? 3 : 0)
            .animation(.easeOut(duration: 0.08), value: pressed)
    }
}

struct CardPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .animation(.spring(response: 0.22, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        stops: [
                            .init(color: .clear, location: phase - 0.3),
                            .init(color: .black.opacity(0.05), location: phase),
                            .init(color: .clear, location: phase + 0.3),
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width)
                }
            )
            .clipped()
            .onAppear {
                withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                    phase = 1.4
                }
            }
    }
}

extension View {
    func cardStyle() -> some View { modifier(CardStyle()) }
    func shimmer() -> some View { modifier(ShimmerModifier()) }
}

// MARK: - Mode Atmosphere (neutralisée sur fond crème Candy)

struct ModeAtmosphere: View {
    let mode: GameMode
    var body: some View { Color.clear.allowsHitTesting(false) }
}
