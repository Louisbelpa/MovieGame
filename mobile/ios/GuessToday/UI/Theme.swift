import SwiftUI

enum Theme {
    // MARK: - Base colours (Minuit Studio — dark cinema theme)
    static let background   = Color(hex: "#0b0b1a")  // --color-film-black (fond global)
    static let surface      = Color(hex: "#13132b")  // --color-film-surface (cartes, inputs, modales)
    static let surfaceAlt   = Color(hex: "#1a1a38")  // --color-film-gray (surface tertiaire)
    static let border       = Color(red: 1, green: 1, blue: 1, opacity: 0.09)   // rgba(255,255,255,0.09)
    static let muted        = Color(red: 1, green: 1, blue: 1, opacity: 0.18)   // rgba(255,255,255,0.18)
    static let text         = Color(hex: "#ece9e2")  // --color-film-text (blanc chaud)
    static let textDim      = Color(red: 236/255, green: 233/255, blue: 226/255, opacity: 0.48)
    static let gold         = Color(hex: "#f5c842")  // --color-film-gold
    static let goldLight    = Color(hex: "#ffe07a")  // --color-film-gold-light
    static let green        = Color(hex: "#2fc87a")  // --color-film-green
    static let red          = Color(hex: "#ff5252")  // --color-film-red
    static let amber        = Color(hex: "#f0a820")  // --color-film-amber

    // MARK: - Mode colours
    static let modeFilm     = Color(hex: "#f5c842")  // --sg-films (gold chaud)
    static let modeSeries   = Color(hex: "#4ecdc4")  // --sg-series (teal menthe)
    static let modeWiki     = Color(hex: "#ff6b9d")  // --sg-wiki (rose)

    // MARK: - Dedicated text colour for primary (gold) buttons
    static let primaryButtonFg = Color(hex: "#0b0b1a")  // dark bg — lisible sur fond gold vif

    // MARK: - Gold gradient (gold vif pour fond sombre)
    static let goldGradient = LinearGradient(
        colors: [Color(hex: "#f5c842"), Color(hex: "#d4a030")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: - Typography (Fraunces = display/serif titles, Inter = body/UI)
    static func fraunces(size: CGFloat, italic: Bool = false) -> Font {
        italic
            ? .custom("Fraunces-MediumItalic", size: size)
            : .custom("Fraunces-Medium", size: size)
    }
    static func inter(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        switch weight {
        case .medium:    return .custom("Inter-Medium",   size: size)
        case .semibold:  return .custom("Inter-SemiBold", size: size)
        case .bold:      return .custom("Inter-Bold",     size: size)
        default:         return .custom("Inter-Regular",  size: size)
        }
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

    // MARK: - Corner radius
    static let radiusS: CGFloat   = 6
    static let radiusM: CGFloat   = 10
    static let radiusL: CGFloat   = 16
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

// MARK: - ViewModifiers

struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var isLoading: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            if isLoading {
                ProgressView().tint(Theme.background)
            }
            configuration.label
        }
        .font(Theme.inter(size: 15, weight: .semibold))
        .foregroundColor(Theme.primaryButtonFg)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(
            Theme.goldGradient
                .opacity(configuration.isPressed ? 0.85 : 1)
        )
        .cornerRadius(Theme.radiusM)
        .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.inter(size: 15, weight: .medium))
            .foregroundColor(Theme.text)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(configuration.isPressed ? Theme.surfaceAlt : Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct CardPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .opacity(configuration.isPressed ? 0.88 : 1.0)
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
                            .init(color: .white.opacity(0.07), location: phase),
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

// MARK: - Mode Atmosphere

struct ModeAtmosphere: View {
    let mode: GameMode

    var body: some View {
        GeometryReader { geo in
            ZStack {
                // Top radial halo (mode-coloured glow at 20% from top)
                RadialGradient(
                    gradient: Gradient(colors: [haloColor.opacity(0.13), .clear]),
                    center: UnitPoint(x: 0.5, y: 0.2),
                    startRadius: 0,
                    endRadius: geo.size.width * 0.65
                )

                // Texture overlay (Canvas drawn, no UIKit dependency)
                Canvas { ctx, size in
                    switch mode {
                    case .film:
                        // Horizontal scan lines — argentique film grain
                        var y: CGFloat = 0
                        while y < size.height {
                            var path = Path()
                            path.move(to: CGPoint(x: 0, y: y + 2))
                            path.addLine(to: CGPoint(x: size.width, y: y + 2))
                            ctx.stroke(path, with: .color(.black.opacity(0.025)), lineWidth: 1)
                            y += 3
                        }
                    case .series:
                        // CRT scanlines — slightly wider spacing
                        var y: CGFloat = 0
                        while y < size.height {
                            var path = Path()
                            path.move(to: CGPoint(x: 0, y: y + 3))
                            path.addLine(to: CGPoint(x: size.width, y: y + 3))
                            ctx.stroke(path, with: .color(.black.opacity(0.018)), lineWidth: 1)
                            y += 4
                        }
                    case .wiki:
                        // Halftone dot grid — press/newspaper feel
                        let spacing: CGFloat = 6
                        var x: CGFloat = 0
                        while x < size.width {
                            var y: CGFloat = 0
                            while y < size.height {
                                let dot = Path(ellipseIn: CGRect(x: x, y: y, width: 1, height: 1))
                                ctx.fill(dot, with: .color(haloColor.opacity(0.055)))
                                y += spacing
                            }
                            x += spacing
                        }
                    }
                }
            }
        }
        .allowsHitTesting(false)
    }

    private var haloColor: Color { mode.color }
}
