import SwiftUI

// MARK: - Model

struct DailyChallengeStatus {
    let mode: GameMode
    let challengeNumber: Int
    let outcome: String?
    let attemptsUsed: Int
    let maxAttempts: Int
    let streak: Int
    let wins: Int
    let gamesPlayed: Int
    let maxStreak: Int

    var isPlayed: Bool  { outcome != nil }
    var isWon: Bool     { outcome == "won" }
    var isLost: Bool    { outcome == "lost" }
    var isInProgress: Bool { outcome == nil && attemptsUsed > 0 }
    var winRate: Double { gamesPlayed > 0 ? Double(wins) / Double(gamesPlayed) : 0 }
}

// MARK: - ViewModel

@Observable
@MainActor
final class HomeViewModel {
    var statuses: [GameMode: DailyChallengeStatus] = [:]
    var isLoading = false

    func load() async {
        isLoading = true
        defer { isLoading = false }
        await withTaskGroup(of: (GameMode, DailyChallengeStatus?).self) { group in
            for mode in [GameMode.film, .series, .wiki] {
                let stats = Self.loadStats(mode: mode)
                group.addTask {
                    do {
                        let payload: ChallengePayload = mode == .wiki
                            ? try await APIClient.shared.todayWikiChallenge()
                            : try await APIClient.shared.todayChallenge(type: mode.apiType)
                        return (mode, DailyChallengeStatus(
                            mode: mode,
                            challengeNumber: payload.challengeNumber,
                            outcome: payload.outcome,
                            attemptsUsed: payload.attemptsUsed,
                            maxAttempts: payload.maxAttempts,
                            streak: stats.currentStreak,
                            wins: stats.wins,
                            gamesPlayed: stats.gamesPlayed,
                            maxStreak: stats.maxStreak
                        ))
                    } catch {
                        return (mode, nil)
                    }
                }
            }
            for await (mode, status) in group {
                if let status { statuses[mode] = status }
            }
        }
    }

    private static func loadStats(mode: GameMode) -> LocalStats {
        guard let data = UserDefaults.standard.data(forKey: "stats_\(mode.statsKey)"),
              let stats = try? JSONDecoder().decode(LocalStats.self, from: data) else {
            return LocalStats()
        }
        return stats
    }

    var completedToday: Int { statuses.values.filter(\.isPlayed).count }
    var bestStreak: Int     { statuses.values.map(\.streak).max() ?? 0 }
    var totalPlayed: Int    { statuses.values.map(\.gamesPlayed).reduce(0, +) }
    var totalWins: Int      { statuses.values.map(\.wins).reduce(0, +) }
    var globalMaxStreak: Int { statuses.values.map(\.maxStreak).max() ?? 0 }
    var overallWinRate: Double {
        totalPlayed > 0 ? Double(totalWins) / Double(totalPlayed) : 0
    }
}

// MARK: - View

struct HomeView: View {
    @State private var vm = HomeViewModel()
    @State private var selectedMode: GameMode? = nil
    @Namespace private var heroNamespace

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 0) {
                        // Header
                        HomeHeader()
                            .padding(.bottom, Theme.spacing16)

                        // Streak pill + progress
                        HStack(alignment: .center) {
                            StreakPill(streak: vm.bestStreak, isLoading: vm.isLoading)
                            Spacer()
                            DayProgressDots(completed: vm.completedToday, isLoading: vm.isLoading)
                        }
                        .padding(.horizontal, Theme.spacing16)
                        .padding(.bottom, Theme.spacing16)

                        // Challenge cards
                        VStack(spacing: Theme.spacing12) {
                            ForEach([GameMode.film, .series, .wiki], id: \.title) { mode in
                                DayChallengeCard(
                                    mode: mode,
                                    status: vm.statuses[mode],
                                    isLoading: vm.isLoading,
                                    namespace: heroNamespace
                                ) {
                                    selectedMode = mode
                                }
                            }
                        }
                        .padding(.horizontal, Theme.spacing16)
                        .padding(.bottom, Theme.spacing16)

                        // Countdown
                        MidnightCountdown()
                            .padding(.horizontal, Theme.spacing16)
                            .padding(.bottom, Theme.spacing16)

                        // Stats
                        if !vm.isLoading {
                            HomeStatsRow(
                                played: vm.totalPlayed,
                                winRate: vm.overallWinRate,
                                maxStreak: vm.globalMaxStreak
                            )
                            .padding(.horizontal, Theme.spacing16)
                            .transition(.opacity)
                        }

                        Spacer(minLength: Theme.spacing24)
                    }
                    .padding(.top, Theme.spacing8)
                    .animation(.easeInOut(duration: 0.3), value: vm.isLoading)
                }
                .refreshable { await vm.load() }
            }
            .navigationBarHidden(true)
            .navigationDestination(item: $selectedMode) { mode in
                if #available(iOS 18.0, *) {
                    GameView(mode: mode)
                        .navigationTransition(.zoom(sourceID: mode, in: heroNamespace))
                } else {
                    GameView(mode: mode)
                }
            }
        }
        .task { await vm.load() }
    }
}

// MARK: - Header

private struct HomeHeader: View {
    private var weekday: String {
        Date().formatted(.dateTime.weekday(.wide).locale(Locale(identifier: "fr_FR"))).capitalized
    }
    private var dayMonth: String {
        Date().formatted(.dateTime.day().month(.wide).locale(Locale(identifier: "fr_FR"))).capitalized
    }

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text(weekday)
                    .font(.system(size: 12, weight: .semibold))
                    .tracking(1.5)
                    .foregroundColor(Theme.textDim)
                    .textCase(.uppercase)
                Text(dayMonth)
                    .font(.custom("Georgia", size: 28))
                    .fontWeight(.bold)
                    .foregroundColor(Theme.text)
            }
            Spacer()
            Text("GT")
                .font(.custom("Georgia", size: 20))
                .fontWeight(.bold)
                .foregroundColor(Theme.gold)
                .frame(width: 40, height: 40)
                .background(Theme.gold.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .padding(.horizontal, Theme.spacing16)
    }
}

// MARK: - Streak pill

private struct StreakPill: View {
    let streak: Int
    let isLoading: Bool

    var body: some View {
        HStack(spacing: 6) {
            Text("🔥")
                .font(.system(size: 13))
            if isLoading {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Theme.surfaceAlt)
                    .frame(width: 80, height: 10)
                    .shimmer()
            } else {
                Text(streak > 0 ? "\(streak) jour\(streak > 1 ? "s" : "") · série active" : "Lance ta série !")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(streak > 0 ? Theme.gold : Theme.textDim)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(
            Capsule()
                .fill(streak > 0 ? Theme.gold.opacity(0.1) : Theme.surface)
                .overlay(
                    Capsule().stroke(
                        streak > 0 ? Theme.gold.opacity(0.3) : Theme.border,
                        lineWidth: 1
                    )
                )
        )
    }
}

// MARK: - Day progress dots

private struct DayProgressDots: View {
    let completed: Int
    let isLoading: Bool

    var body: some View {
        HStack(spacing: 6) {
            Text(completed == 3 ? "Tous complétés" : "\(completed)/3")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(completed == 3 ? Theme.green : Theme.textDim)
            HStack(spacing: 5) {
                ForEach(0..<3) { i in
                    Circle()
                        .fill(dotColor(i))
                        .frame(width: 8, height: 8)
                        .scaleEffect(isLoading ? 0.8 : 1)
                        .animation(.spring(response: 0.3).delay(Double(i) * 0.05), value: completed)
                }
            }
        }
    }

    private func dotColor(_ index: Int) -> Color {
        guard !isLoading else { return Theme.surfaceAlt }
        return index < completed ? Theme.green : Theme.surfaceAlt
    }
}

// MARK: - Midnight countdown

private struct MidnightCountdown: View {
    @State private var timeRemaining = ""
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack(spacing: Theme.spacing8) {
            Image(systemName: "clock")
                .font(.system(size: 12))
                .foregroundColor(Theme.muted)
            Text("Prochain défi dans")
                .font(.system(size: 12))
                .foregroundColor(Theme.textDim)
            Spacer()
            Text(timeRemaining)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundColor(Theme.text)
        }
        .padding(.horizontal, Theme.spacing16)
        .padding(.vertical, Theme.spacing12)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        .onReceive(timer) { _ in timeRemaining = secondsUntilMidnight() }
        .onAppear { timeRemaining = secondsUntilMidnight() }
    }

    private func secondsUntilMidnight() -> String {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "Europe/Paris") ?? .current
        let now = Date()
        guard let tomorrow = cal.nextDate(
            after: now,
            matching: DateComponents(hour: 0, minute: 0, second: 0),
            matchingPolicy: .nextTime
        ) else { return "--:--:--" }
        let diff = max(0, Int(tomorrow.timeIntervalSince(now)))
        let h = diff / 3600, m = (diff % 3600) / 60, s = diff % 60
        return String(format: "%02d:%02d:%02d", h, m, s)
    }
}

// MARK: - Stats row

private struct HomeStatsRow: View {
    let played: Int
    let winRate: Double
    let maxStreak: Int

    var body: some View {
        HStack(spacing: 0) {
            HomeStatCell(
                value: played > 0 ? "\(played)" : "–",
                label: "parties",
                color: played > 0 ? Theme.text : Theme.muted
            )
            Divider().frame(height: 28).background(Theme.border)
            HomeStatCell(
                value: played > 0 ? "\(Int(winRate * 100))%" : "–",
                label: "victoires",
                color: played > 0 ? (winRate > 0.7 ? Theme.green : Theme.text) : Theme.muted
            )
            Divider().frame(height: 28).background(Theme.border)
            HomeStatCell(
                value: maxStreak > 0 ? "\(maxStreak) 🔥" : "–",
                label: "record",
                color: maxStreak > 0 ? Theme.gold : Theme.muted
            )
        }
        .padding(.vertical, 14)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
    }
}

private struct HomeStatCell: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 3) {
            Text(value)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .tracking(0.5)
                .foregroundColor(Theme.muted)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Challenge card

private struct DayChallengeCard: View {
    let mode: GameMode
    let status: DailyChallengeStatus?
    let isLoading: Bool
    let namespace: Namespace.ID
    let onTap: () -> Void

    private var isCompleted: Bool { status?.isPlayed == true }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Theme.spacing16) {
                // Mode icon
                Image(systemName: modeIcon)
                    .font(.system(size: 20))
                    .foregroundColor(modeColor)
                    .frame(width: 44, height: 44)
                    .background(modeColor.opacity(isCompleted ? 0.07 : 0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .modifier(HeroSourceModifier(id: mode, namespace: namespace))

                // Labels
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(mode.title.uppercased())
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(1)
                            .foregroundColor(isCompleted ? Theme.muted : Theme.textDim)
                        if let s = status {
                            Text("#\(s.challengeNumber)")
                                .font(.system(size: 11))
                                .foregroundColor(Theme.muted.opacity(0.6))
                        }
                    }

                    if isLoading && status == nil {
                        VStack(alignment: .leading, spacing: 5) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Theme.surfaceAlt)
                                .frame(width: 110, height: 11)
                                .shimmer()
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Theme.surfaceAlt)
                                .frame(width: 70, height: 9)
                                .shimmer()
                        }
                    } else if let s = status {
                        Text(statusLabel(s))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(statusTextColor(s))

                        // Attempts bar — only when in progress
                        if s.isInProgress {
                            AttemptsBar(used: s.attemptsUsed, max: s.maxAttempts)
                                .padding(.top, 1)
                        }
                    } else {
                        Text("Non joué")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(Theme.textDim)
                    }
                }

                Spacer()

                // Right side: outcome OR CTA
                if let s = status {
                    outcomeOrStreak(s)
                } else if isLoading {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Theme.surfaceAlt)
                        .frame(width: 32, height: 10)
                        .shimmer()
                } else {
                    ctaLabel
                }
            }
            .padding(Theme.spacing16)
            .background(Theme.surface)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(borderColor, lineWidth: 1)
            )
        }
        .buttonStyle(CardPressStyle())
        .opacity(isCompleted ? 0.72 : 1.0)
        .animation(.easeInOut(duration: 0.25), value: status?.outcome)
    }

    // MARK: Helpers

    @ViewBuilder
    private func outcomeOrStreak(_ s: DailyChallengeStatus) -> some View {
        VStack(alignment: .trailing, spacing: 4) {
            if s.isWon {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(Theme.green)
                    .font(.system(size: 20))
                    .symbolEffect(.bounce, value: s.isWon)
            } else if s.isLost {
                Image(systemName: "xmark.circle.fill")
                    .foregroundColor(Theme.red)
                    .font(.system(size: 20))
                    .symbolEffect(.bounce, value: s.isLost)
            } else {
                // In progress: show streak + clock
                Image(systemName: "clock.fill")
                    .foregroundColor(Theme.gold)
                    .font(.system(size: 18))
            }
            // Streak
            HStack(spacing: 2) {
                Text("🔥")
                    .font(.system(size: 11))
                Text(s.streak > 0 ? "\(s.streak)" : "–")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(s.streak > 0 ? Theme.gold : Theme.muted)
            }
        }
    }

    private var ctaLabel: some View {
        HStack(spacing: 3) {
            Text("Jouer")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.gold)
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Theme.gold)
        }
    }

    private var modeIcon: String {
        switch mode {
        case .film:   return "film"
        case .series: return "tv"
        case .wiki:   return "person.text.rectangle"
        }
    }

    private var modeColor: Color {
        switch mode {
        case .film:   return Theme.gold
        case .series: return Color(hex: "#8b6ff0")
        case .wiki:   return Theme.green
        }
    }

    private var borderColor: Color {
        guard let s = status else { return Theme.border }
        if s.isWon  { return Theme.green.opacity(0.3) }
        if s.isLost { return Theme.red.opacity(0.2) }
        if s.isInProgress { return Theme.gold.opacity(0.25) }
        return Theme.border
    }

    private func statusLabel(_ s: DailyChallengeStatus) -> String {
        if s.isWon  { return "Trouvé en \(s.attemptsUsed) essai\(s.attemptsUsed > 1 ? "s" : "")" }
        if s.isLost { return "Non trouvé" }
        if s.isInProgress { return "En cours…" }
        return "Non joué"
    }

    private func statusTextColor(_ s: DailyChallengeStatus) -> Color {
        if s.isWon  { return Theme.green }
        if s.isLost { return Theme.red }
        if s.isInProgress { return Theme.gold }
        return Theme.textDim
    }
}

// MARK: - Attempts bar (for in-progress)

private struct AttemptsBar: View {
    let used: Int
    let max: Int

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<max, id: \.self) { i in
                RoundedRectangle(cornerRadius: 2)
                    .fill(i < used ? Theme.gold.opacity(0.8) : Theme.surfaceAlt)
                    .frame(height: 3)
            }
        }
        .frame(width: 72)
    }
}

// MARK: - iOS 18 hero transition helper

private struct HeroSourceModifier: ViewModifier {
    let id: GameMode
    let namespace: Namespace.ID

    func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content.matchedTransitionSource(id: id, in: namespace)
        } else {
            content
        }
    }
}
