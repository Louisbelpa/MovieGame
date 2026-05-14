import SwiftUI

enum Theme {
    // MARK: - Colours (mirrored from web CSS variables)
    static let background   = Color(hex: "#16161f")  // film-black
    static let surface      = Color(hex: "#20202e")  // film-dark
    static let surfaceAlt   = Color(hex: "#28283a")  // film-gray
    static let border       = Color(hex: "#3a3a52")  // film-border
    static let muted        = Color(hex: "#56566e")  // film-muted
    static let text         = Color(hex: "#f0ebe4")  // film-text
    static let textDim      = Color(hex: "#a09898")  // film-text-dim
    static let gold         = Color(hex: "#d4a842")  // film-gold
    static let goldLight    = Color(hex: "#f0c060")  // film-gold-light
    static let green        = Color(hex: "#4caf78")  // film-green
    static let red          = Color(hex: "#e05050")  // film-red
    static let amber        = Color(hex: "#e09040")  // film-amber

    // MARK: - Typography
    static let titleFont: Font    = .custom("Georgia", size: 22)
    static let bodyFont: Font     = .system(size: 15)
    static let captionFont: Font  = .system(size: 12)

    // MARK: - Spacing
    static let spacing4: CGFloat  = 4
    static let spacing8: CGFloat  = 8
    static let spacing12: CGFloat = 12
    static let spacing16: CGFloat = 16
    static let spacing20: CGFloat = 20
    static let spacing24: CGFloat = 24

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
        .font(.system(size: 15, weight: .semibold))
        .foregroundColor(Theme.background)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(configuration.isPressed ? Theme.goldLight : Theme.gold)
        .cornerRadius(Theme.radiusM)
        .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .medium))
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
                            .init(color: .white.opacity(0.1), location: phase),
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
