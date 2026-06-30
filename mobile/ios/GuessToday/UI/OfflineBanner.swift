import SwiftUI

struct OfflineBanner: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
                .font(.system(size: 13, weight: .semibold))
            Text("Pas de connexion")
                .font(Theme.inter(size: 13, weight: .medium))
        }
        .foregroundColor(Theme.text)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Theme.surfaceAlt.opacity(0.98))
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Theme.border)
                .frame(height: 1)
        }
        .accessibilityLabel("Pas de connexion internet")
    }
}
