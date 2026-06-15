import SwiftUI

/// Onglet « Stats » — Stats du jour de la communauté, par jeu (taux de victoire,
/// essais moyens, joueurs, répartition des tentatives).
struct StatsView: View {
    @State private var selectedMode: GameMode = .film
    @State private var scope: StatsScope = .today
    @State private var stats: CommunityStats?
    @State private var globalData: CommunityStats?
    @State private var challengeNumber: Int?
    @State private var isLoading = false
    @State private var error: String?

    private let modes: [GameMode] = [.film, .series, .wiki]

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.spacing16) {
                        // En-tête
                        VStack(alignment: .leading, spacing: 4) {
                            Text(scope == .today ? "Stats du jour 📊" : "Stats globales 🌍")
                                .font(Theme.fraunces(size: 27))
                                .foregroundColor(Theme.ink)
                            Text(headerSubtitle)
                                .font(Theme.mono(size: 12, weight: .medium))
                                .foregroundColor(Theme.ink2)
                        }

                        // Portée : défi du jour vs cumul global
                        ScopeToggle(scope: $scope)

                        // Sélecteur de jeu (uniquement pertinent pour le défi du jour)
                        if scope == .today {
                            ModePills(selected: $selectedMode)
                        }

                        let current = scope == .today ? stats : globalData
                        if isLoading && current == nil {
                            ProgressView().tint(scope == .today ? selectedMode.color : Theme.coral)
                                .frame(maxWidth: .infinity).padding(.vertical, 40)
                        } else if let s = current {
                            statsCard(s)
                        } else if let error {
                            Text(error).font(Theme.inter(size: 14)).foregroundColor(Theme.ink2)
                                .frame(maxWidth: .infinity).padding(.vertical, 30)
                        } else {
                            Text(scope == .today ? "Pas encore de données pour ce défi." : "Pas encore de données.")
                                .font(Theme.inter(size: 14)).foregroundColor(Theme.ink2)
                                .frame(maxWidth: .infinity).padding(.vertical, 30)
                        }
                    }
                    .padding(.horizontal, Theme.spacing16)
                    .padding(.top, Theme.spacing8)
                    .padding(.bottom, Theme.spacing24)
                }
            }
            .navigationBarHidden(true)
            .task(id: "\(scope.rawValue)-\(selectedMode.apiType)") { await load() }
        }
    }

    private var headerSubtitle: String {
        switch scope {
        case .today:  return challengeNumber.map { "\(selectedMode.title) · Défi #\($0)" } ?? selectedMode.title
        case .global: return "Communauté · tous les défis"
        }
    }

    @ViewBuilder
    private func statsCard(_ s: CommunityStats) -> some View {
        let accent = scope == .today ? selectedMode.accentDark : Theme.coral
        let barColor = scope == .today ? selectedMode.color : Theme.coral

        // Tuiles
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            StatTile(value: "\(s.winRate)%", label: "Taux de victoire", accent: accent)
            StatTile(value: s.avgAttempts > 0 ? String(format: "%.1f", s.avgAttempts) : "—", label: "Essais moyens", accent: Theme.ink)
            StatTile(value: "\(s.totalGames)", label: scope == .today ? "Joueurs" : "Parties", accent: Theme.ink)
            StatTile(value: "\(s.totalWins)", label: "Victoires", accent: Theme.correctDark)
        }

        // Répartition des tentatives
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            Text("Répartition des tentatives")
                .font(Theme.inter(size: 15, weight: .semibold))
                .foregroundColor(Theme.ink)
            let maxVal = max(1, s.winValues.max() ?? 1)
            ForEach(Array(s.winValues.enumerated()), id: \.offset) { i, val in
                AttemptBarRow(label: "\(i + 1)", value: val, maxValue: maxVal, color: barColor)
            }
        }
        .padding(Theme.spacing16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .candyCard(radius: Theme.radiusM)
    }

    private func load() async {
        if scope == .global { await loadGlobal(); return }
        #if DEBUG || NRT
        if FeatureFlags.shared.useMockData {
            stats = MockData.communityStats(for: selectedMode)
            challengeNumber = MockData.hubStatus(for: selectedMode).number
            return
        }
        #endif
        isLoading = true; error = nil
        defer { isLoading = false }
        do {
            let challenge: ChallengePayload = selectedMode == .wiki
                ? try await APIClient.shared.todayWikiChallenge()
                : try await APIClient.shared.todayChallenge(type: selectedMode.apiType)
            challengeNumber = challenge.challengeNumber
            stats = try await APIClient.shared.communityStats(challengeId: challenge.challengeId)
        } catch {
            self.error = "Stats indisponibles pour l'instant."
            stats = nil
        }
    }

    private func loadGlobal() async {
        #if DEBUG || NRT
        if FeatureFlags.shared.useMockData {
            globalData = MockData.communityStats(for: .film)
            return
        }
        #endif
        isLoading = true; error = nil
        defer { isLoading = false }
        do {
            globalData = try await APIClient.shared.globalStats()
        } catch {
            self.error = "Stats globales indisponibles."
            globalData = nil
        }
    }
}

enum StatsScope: String, CaseIterable {
    case today, global
    var title: String {
        switch self {
        case .today:  return "Aujourd'hui"
        case .global: return "Global"
        }
    }
}

// MARK: - Sub-components

private struct ModePills: View {
    @Binding var selected: GameMode
    private let modes: [GameMode] = [.film, .series, .wiki]

    var body: some View {
        HStack(spacing: 5) {
            ForEach(modes, id: \.title) { mode in
                let isActive = selected == mode
                Button(mode.shortName) {
                    withAnimation(.easeInOut(duration: 0.18)) { selected = mode }
                }
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundColor(isActive ? mode.accentDark : Theme.ink2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .fill(isActive ? mode.accentSoft : .clear)
                        .overlay(RoundedRectangle(cornerRadius: 11, style: .continuous).strokeBorder(isActive ? mode.color.opacity(0.5) : .clear, lineWidth: 1.5))
                )
            }
        }
        .padding(4)
        .candyCard(radius: Theme.radiusM, fill: Theme.surfaceAlt, border: Theme.line, shadow: Theme.line2, depth: 4)
    }
}

private struct ScopeToggle: View {
    @Binding var scope: StatsScope

    var body: some View {
        HStack(spacing: 5) {
            ForEach(StatsScope.allCases, id: \.self) { s in
                let isActive = scope == s
                Button(s.title) {
                    withAnimation(.easeInOut(duration: 0.18)) { scope = s }
                }
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundColor(isActive ? Theme.coralDark : Theme.ink2)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .fill(isActive ? Theme.coralSoft : .clear)
                        .overlay(RoundedRectangle(cornerRadius: 11, style: .continuous).strokeBorder(isActive ? Theme.coral.opacity(0.5) : .clear, lineWidth: 1.5))
                )
            }
        }
        .padding(4)
        .candyCard(radius: Theme.radiusM, fill: Theme.surfaceAlt, border: Theme.line, shadow: Theme.line2, depth: 4)
    }
}

private struct StatTile: View {
    let value: String
    let label: String
    var accent: Color = Theme.ink

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(Theme.mono(size: 26, weight: .bold)).foregroundColor(accent)
            Text(label).font(Theme.inter(size: 12, weight: .medium)).foregroundColor(Theme.ink2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Theme.spacing16)
        .candyCard(radius: Theme.radiusM)
    }
}

private struct AttemptBarRow: View {
    let label: String
    let value: Int
    let maxValue: Int
    let color: Color

    var body: some View {
        HStack(spacing: 10) {
            Text(label)
                .font(Theme.mono(size: 14, weight: .bold))
                .foregroundColor(Theme.ink2)
                .frame(width: 16, alignment: .trailing)
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Theme.surfaceAlt)
                    Capsule().fill(color)
                        .frame(width: max(22, geo.size.width * CGFloat(value) / CGFloat(maxValue)))
                        .overlay(
                            Text("\(value)")
                                .font(Theme.mono(size: 11, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.trailing, 8),
                            alignment: .trailing
                        )
                }
            }
            .frame(height: 22)
        }
    }
}
