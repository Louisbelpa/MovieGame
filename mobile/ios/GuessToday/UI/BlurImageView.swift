import SwiftUI

struct BlurImageView: View {
    let url: String?
    let blurRadius: Double
    let mediaType: String  // "film", "series", "wiki"
    var flashColor: Color? = nil

    private var isWiki: Bool { mediaType == "wiki" }
    private var badgeIcon: String { mediaType == "series" ? "tv" : "film" }

    var body: some View {
        Group {
            if let urlStr = url, let imageURL = URL(string: urlStr) {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .blur(radius: blurRadius, opaque: true)
                            .animation(.spring(response: 0.55, dampingFraction: 0.8), value: blurRadius)
                    case .failure:
                        ImagePlaceholder()
                    case .empty:
                        ShimmerPlaceholder(isWiki: isWiki)
                    @unknown default:
                        ImagePlaceholder()
                    }
                }
            } else {
                ImagePlaceholder()
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: isWiki ? 280 : 240)
        .clipped()
        .cornerRadius(Theme.radiusL)
        // Bottom gradient overlay — mirrors web GamePage image gradient
        .overlay(alignment: .bottom) {
            LinearGradient(
                colors: [.clear, Theme.background.opacity(0.80)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 80)
            .cornerRadius(Theme.radiusL)
            .allowsHitTesting(false)
        }
        // Flash feedback
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusL)
                .fill(flashColor ?? .clear)
                .allowsHitTesting(false)
                .animation(.easeOut(duration: 0.4), value: flashColor != nil)
        )
        // Subtle border
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusL)
                .stroke(Theme.border, lineWidth: 1)
        )
        // "Scène" badge top-left
        .overlay(alignment: .topLeading) {
            if !isWiki {
                HStack(spacing: 4) {
                    Image(systemName: badgeIcon)
                        .font(.system(size: 9, weight: .medium))
                    Text("Scène")
                        .font(Theme.inter(size: 10, weight: .medium))
                }
                .foregroundColor(Theme.textDim)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(.ultraThinMaterial)
                .cornerRadius(6)
                .padding(8)
            }
        }
    }
}

private struct ImagePlaceholder: View {
    var body: some View {
        Rectangle()
            .fill(Theme.surfaceAlt)
            .overlay(
                Image(systemName: "photo")
                    .font(.system(size: 40))
                    .foregroundColor(Theme.muted)
            )
    }
}

private struct ShimmerPlaceholder: View {
    let isWiki: Bool
    @State private var phase: CGFloat = -1

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Theme.surfaceAlt

                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0),
                        .init(color: Color.white.opacity(0.06), location: 0.45),
                        .init(color: Color.white.opacity(0.09), location: 0.5),
                        .init(color: Color.white.opacity(0.06), location: 0.55),
                        .init(color: .clear, location: 1),
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .frame(width: geo.size.width * 2)
                .offset(x: phase * geo.size.width * 2)
            }
        }
        .onAppear {
            withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                phase = 1
            }
        }
    }
}
