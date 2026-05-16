import SwiftUI

struct BlurImageView: View {
    let url: String?
    let blurRadius: Double
    let isWiki: Bool
    var flashColor: Color? = nil

    var body: some View {
        Group {
            if let urlStr = url, let imageURL = URL(string: urlStr) {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: isWiki ? .fill : .fit)
                            .blur(radius: blurRadius, opaque: true)
                            .animation(.spring(response: 0.55, dampingFraction: 0.8), value: blurRadius)
                    case .failure:
                        ImagePlaceholder()
                    case .empty:
                        ImagePlaceholder()
                            .overlay(ProgressView().tint(Theme.gold))
                    @unknown default:
                        ImagePlaceholder()
                    }
                }
            } else {
                ImagePlaceholder()
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: isWiki ? 260 : 220)
        .clipped()
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .fill(flashColor ?? .clear)
                .allowsHitTesting(false)
                .animation(.easeOut(duration: 0.4), value: flashColor != nil)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(Theme.border, lineWidth: 1)
        )
        .overlay(alignment: .topLeading) {
            if !isWiki {
                HStack(spacing: 4) {
                    Image(systemName: "clapperboard")
                        .font(.system(size: 9, weight: .medium))
                    Text("Scène")
                        .font(.system(size: 10, weight: .medium))
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
