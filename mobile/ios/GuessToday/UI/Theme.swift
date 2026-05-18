import SwiftUI

enum Theme {
    // MARK: - Base colours (Light Mode — mirrored from web CSS variables)
    static let background   = Color(hex: "#F4F1EB")  // --color-film-black (crème chaud)
    static let surface      = Color(hex: "#FFFFFF")  // --color-film-surface (cartes/modales)
    static let surfaceAlt   = Color(hex: "#EDE9E1")  // --color-film-dark (surface secondaire)
    static let border       = Color(hex: "#DDD8CE")  // --color-film-border
    static let muted        = Color(hex: "#A89F96")  // --color-film-muted
    static let text         = Color(hex: "#1C1816")  // --color-film-text
    static let textDim      = Color(hex: "#6B625A")  // --color-film-text-dim
    static let gold         = Color(hex: "#C07C0A")  // --color-film-gold (ambre profond)
    static let goldLight    = Color(hex: "#D4900F")  // --color-film-gold-light
    static let green        = Color(hex: "#1E8449")  // --color-film-green
    static let red          = Color(hex: "#C0392B")  // --color-film-red
    static let amber        = Color(hex: "#B7770D")  // --color-film-amber

    // MARK: - Mode colours
    static let modeFilm     = Color(hex: "#C07C0A")  // --sg-films (ambre profond)
    static let modeSeries   = Color(hex: "#4A50E0")  // --sg-series (indigo dense)
    static let modeWiki     = Color(hex: "#C91F5A")  // --sg-wiki (rose framboise)

    // MARK: - Dedicated text colour for primary (gold) buttons
    static let primaryButtonFg = Color(hex: "#1A0F00")  // dark brown — lisible sur fond ambre

    // MARK: - Gold gradient (ambre profond pour fond clair)
    static let goldGradient = LinearGradient(
        colors: [Color(hex: "#D4900F"), Color(hex: "#C07C0A"), Color(hex: "#8A5500")],
        startPoint: .top,
        endPoint: .bottom
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
                            .init(color: .black.opacity(0.06), location: phase),
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
                    gradient: Gradient(colors: [haloColor.opacity(0.07), .clear]),
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
