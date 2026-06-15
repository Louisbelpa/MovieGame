import SwiftUI

/// Onglet « Classement » — podium + tableau global (réutilise GlobalLeaderboardView).
struct LeaderboardView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.spacing16) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Classement 🏆")
                                .font(Theme.fraunces(size: 27))
                                .foregroundColor(Theme.ink)
                            Text("Les meilleurs joueurs")
                                .font(Theme.mono(size: 12, weight: .medium))
                                .foregroundColor(Theme.ink2)
                        }
                        .padding(.horizontal, Theme.spacing16)
                        .padding(.top, Theme.spacing8)

                        GlobalLeaderboardView()
                            .padding(.horizontal, Theme.spacing16)
                    }
                    .padding(.bottom, Theme.spacing24)
                }
            }
            .navigationBarHidden(true)
        }
    }
}
