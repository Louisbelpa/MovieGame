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

    var isPlayed: Bool     { outcome != nil }
    var isWon: Bool        { outcome == "won" }
    var isLost: Bool       { outcome == "lost" }
    var isInProgress: Bool { outcome == nil && attemptsUsed > 0 }
}

// MARK: - ViewModel

@Observable
@MainActor
final class HomeViewModel {
    var statuses: [GameMode: DailyChallengeStatus] = [:]
    var friendsPlayedCount: Int? = nil
    var isLoading = false

    func load() async {
        isLoading = true
        defer { isLoading = false }
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadStatuses() }
            group.addTask { await self.loadFriends() }
        }
    }

    private func loadStatuses() async {
        await withTaskGroup(of: (GameMode, DailyChallengeStatus?).self) { group in
            for mode in [GameMode.film, .series, .wiki] {
                group.addTask {
                    do {
                        let payload: ChallengePayload = mode == .wiki
                            ? try await APIClient.shared.todayWikiChallenge()
                            : try await APIClient.shared.todayChallenge(type: mode.apiType)
                        let s = await StatsManager.shared.stats(for: mode)
                        return (mode, DailyChallengeStatus(
                            mode: mode,
                            challengeNumber: payload.challengeNumber,
                            outcome: payload.outcome,
                            attemptsUsed: payload.attemptsUsed,
                            maxAttempts: payload.maxAttempts,
                            streak: s.currentStreak,
                            wins: s.wins,
                            gamesPlayed: s.gamesPlayed,
                            maxStreak: s.maxStreak
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

    private func loadFriends() async {
        let today = todayParis()
        if let payload = try? await APIClient.shared.friends(date: today) {
            let played = payload.friends.filter { entry in
                entry.scores.film != nil || entry.scores.series != nil || entry.scores.wiki != nil
            }.count
            friendsPlayedCount = played > 0 ? played : nil
        }
    }

    func refreshStats() {
        for mode in [GameMode.film, .series, .wiki] {
            guard let existing = statuses[mode] else { continue }
            let s = StatsManager.shared.stats(for: mode)
            statuses[mode] = DailyChallengeStatus(
                mode: existing.mode,
                challengeNumber: existing.challengeNumber,
                outcome: existing.outcome,
                attemptsUsed: existing.attemptsUsed,
                maxAttempts: existing.maxAttempts,
                streak: s.currentStreak,
                wins: s.wins,
                gamesPlayed: s.gamesPlayed,
                maxStreak: s.maxStreak
            )
        }
    }

    var completedToday: Int { statuses.values.filter(\.isPlayed).count }
    var currentStreak: Int  { statuses.values.map(\.streak).max() ?? 0 }
    var globalMaxStreak: Int { statuses.values.map(\.maxStreak).max() ?? 0 }

    private func todayParis() -> String {
        let fmt = DateFormatter()
        fmt.locale = Locale(identifier: "en_CA")
        fmt.timeZone = TimeZone(identifier: "Europe/Paris")
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: Date())
    }
}

// MARK: - View

struct HomeView: View {
    @State private var vm = HomeViewModel()
    @State private var selectedMode: GameMode? = nil
    private var statsManager: StatsManager { StatsManager.shared }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.spacing16) {

                        // 1. Header
                        HomeHeader()
                            .padding(.horizontal, Theme.spacing16)
                            .padding(.top, Theme.spacing8)

                        // 2. Streak banner
                        StreakBanner(
                            streak: vm.currentStreak,
                            maxStreak: vm.globalMaxStreak,
                            isLoading: vm.isLoading
                        )
                        .padding(.horizontal, Theme.spacing16)

                        // 3. Défis du jour
                        VStack(spacing: Theme.spacing8) {
                            // Section header
                            HStack {
                                Text("Défis du jour")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(Theme.textDim)
                                Spacer()
                                CompletionBadge(completed: vm.completedToday, isLoading: vm.isLoading)
                            }
                            .padding(.horizontal, Theme.spacing16)

                            ForEach([GameMode.film, .series, .wiki], id: \.title) { mode in
                                DayChallengeCard(
                                    mode: mode,
                                    status: vm.statuses[mode],
                                    isLoading: vm.isLoading
                                ) { selectedMode = mode }
                                .padding(.horizontal, Theme.spacing16)
                            }
                        }

                        // 4. Countdown
                        MidnightCountdown()
                            .padding(.horizontal, Theme.spacing16)

                        // 5. Friends snippet
                        if let count = vm.friendsPlayedCount {
                            FriendsSnippet(count: count)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        Spacer(minLength: Theme.spacing24)
                    }
                    .animation(.easeInOut(duration: 0.3), value: vm.isLoading)
                }
                .refreshable { await vm.load() }
            }
            .navigationBarHidden(true)
            .navigationDestination(item: $selectedMode) { mode in
                GameView(mode: mode)
            }
        }
        .onAppear { Task { await vm.load() } }
        .onChange(of: statsManager.filmStats.gamesPlayed)   { _, _ in vm.refreshStats() }
        .onChange(of: statsManager.seriesStats.gamesPlayed) { _, _ in vm.refreshStats() }
        .onChange(of: statsManager.wikiStats.gamesPlayed)   { _, _ in vm.refreshStats() }
    }
}

// MARK: - 1. Header

private struct HomeHeader: View {
    private var weekday: String {
        Date().formatted(.dateTime.weekday(.wide).locale(Locale(identifier: "fr_FR"))).uppercased()
    }
    private var dayMonth: String {
        Date().formatted(.dateTime.day().month(.wide).locale(Locale(identifier: "fr_FR"))).capitalized
    }

    var body: some View {
        HStack(alignment: .center) {
            // Wordmark
            HStack(spacing: 7) {
                ApertureIconView(size: 22)
                (
                    Text("Guess")
                        .font(Theme.fraunces(size: 20))
                        .foregroundColor(Theme.text)
                    + Text("today")
                        .font(Theme.fraunces(size: 20, italic: true))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color(hex: "#e8c06a"), Color(hex: "#d4a64a"), Color(hex: "#a07030")],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                )
            }

            Spacer()

            // Date
            VStack(alignment: .trailing, spacing: 1) {
                Text(weekday)
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(1.2)
                    .foregroundColor(Theme.muted)
                Text(dayMonth)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Theme.textDim)
            }
        }
    }
}

// MARK: - 2. Streak banner

private struct StreakBanner: View {
    let streak: Int
    let maxStreak: Int
    let isLoading: Bool

    var body: some View {
        HStack(alignment: .center, spacing: 0) {
            // Left: streak
            VStack(alignment: .leading, spacing: 4) {
                Text(streak > 0 ? "🔥 Série en cours" : "🎬 Commence ta série !")
                    .font(.system(size: 11, weight: .semibold))
                    .tracking(0.5)
                    .foregroundColor(streak > 0 ? Color(hex: "#f59e0b").opacity(0.85) : Theme.textDim)

                if isLoading {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white.opacity(0.08))
                        .frame(width: 80, height: 36)
                        .shimmer()
                } else if streak > 0 {
                    HStack(alignment: .lastTextBaseline, spacing: 4) {
                        Text("\(streak)")
                            .font(.system(size: 40, weight: .bold, design: .rounded))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color(hex: "#e8c06a"), Color(hex: "#d4a64a")],
                                    startPoint: .top, endPoint: .bottom
                                )
                            )
                        Text("jour\(streak > 1 ? "s" : "")")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.textDim)
                            .padding(.bottom, 4)
                    }
                } else {
                    Text("Joue aujourd'hui pour\ndémarrer une série !")
                        .font(.system(size: 13))
                        .foregroundColor(Theme.textDim)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            Spacer()

            // Right: record
            if maxStreak > 0 {
                VStack(alignment: .trailing, spacing: 3) {
                    Text("RECORD")
                        .font(.system(size: 9, weight: .semibold))
                        .tracking(1.5)
                        .foregroundColor(Theme.muted)
                    HStack(alignment: .lastTextBaseline, spacing: 3) {
                        Text("\(maxStreak)")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(Theme.gold)
                        Text("j")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.muted)
                            .padding(.bottom, 2)
                    }
                }
            }
        }
        .padding(.horizontal, Theme.spacing20)
        .padding(.vertical, Theme.spacing16)
        .background(
            ZStack {
                RoundedRectangle(cornerRadius: Theme.radiusL)
                    .fill(
                        LinearGradient(
                            colors: streak > 0
                                ? [Color(hex: "#2a1a08"), Color(hex: "#1a1208")]
                                : [Theme.surface, Theme.surfaceAlt],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                RoundedRectangle(cornerRadius: Theme.radiusL)
                    .stroke(
                        streak > 0
                            ? Color(hex: "#f59e0b").opacity(0.2)
                            : Theme.border,
                        lineWidth: 1
                    )
            }
        )
    }
}

// MARK: - 3a. Completion badge

private struct CompletionBadge: View {
    let completed: Int
    let isLoading: Bool

    var body: some View {
        HStack(spacing: 5) {
            if isLoading {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Theme.surfaceAlt)
                    .frame(width: 32, height: 10)
                    .shimmer()
            } else {
                Text("\(completed)/3")
                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    .foregroundColor(completed == 3 ? Theme.green : Theme.textDim)
                if completed == 3 {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Theme.green)
                }
            }
        }
    }
}

// MARK: - 3b. Challenge card

private struct DayChallengeCard: View {
    let mode: GameMode
    let status: DailyChallengeStatus?
    let isLoading: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Theme.spacing16) {

                // Icon
                Image(systemName: modeIcon)
                    .font(.system(size: 18))
                    .foregroundColor(modeColor)
                    .frame(width: 42, height: 42)
                    .background(modeColor.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10))

                // Content
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(mode.title.uppercased())
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(1)
                            .foregroundColor(Theme.muted)
                        if let n = status?.challengeNumber {
                            Text("#\(n)")
                                .font(.system(size: 10))
                                .foregroundColor(Theme.muted.opacity(0.55))
                        }
                    }

                    if isLoading && status == nil {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Theme.surfaceAlt)
                            .frame(width: 100, height: 12)
                            .shimmer()
                    } else if let s = status {
                        Text(mainLabel(s))
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(mainLabelColor(s))
                    } else {
                        Text("À jouer")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(Theme.textDim)
                    }
                }

                Spacer()

                // Right CTA or outcome
                if let s = status {
                    outcomeView(s)
                } else if !isLoading {
                    playButton
                } else {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Theme.surfaceAlt)
                        .frame(width: 60, height: 30)
                        .shimmer()
                }
            }
            .padding(Theme.spacing16)
            .background(cardBackground)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14).stroke(cardBorder, lineWidth: 1)
            )
        }
        .buttonStyle(CardPressStyle())
    }

    // MARK: Subviews

    @ViewBuilder
    private func outcomeView(_ s: DailyChallengeStatus) -> some View {
        if s.isWon {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(Theme.green)
                .font(.system(size: 22))
                .symbolEffect(.bounce, value: s.isWon)
        } else if s.isLost {
            Image(systemName: "xmark.circle.fill")
                .foregroundColor(Theme.red.opacity(0.8))
                .font(.system(size: 22))
        } else {
            Image(systemName: "clock")
                .foregroundColor(Theme.gold.opacity(0.7))
                .font(.system(size: 20))
        }
    }

    private var playButton: some View {
        HStack(spacing: 4) {
            Text("Jouer")
                .font(.system(size: 13, weight: .semibold))
            Image(systemName: "arrow.right")
                .font(.system(size: 11, weight: .bold))
        }
        .foregroundColor(modeColor)
        .padding(.horizontal, 12)
        .padding(.vertical, 7)
        .background(modeColor.opacity(0.12))
        .cornerRadius(8)
    }

    // MARK: Helpers

    private func mainLabel(_ s: DailyChallengeStatus) -> String {
        if s.isWon  { return "Gagné en \(s.attemptsUsed)/\(s.maxAttempts)" }
        if s.isLost { return "Pas trouvé" }
        if s.isInProgress { return "En cours…" }
        return "À jouer"
    }

    private func mainLabelColor(_ s: DailyChallengeStatus) -> Color {
        if s.isWon  { return Theme.green }
        if s.isLost { return Theme.red }
        if s.isInProgress { return Theme.gold }
        return Theme.textDim
    }

    private var cardBackground: some View {
        Group {
            if let s = status {
                if s.isWon  { Color(hex: "#0f2318") }
                else if s.isLost { Color(hex: "#1f1010") }
                else { Theme.surface }
            } else {
                Theme.surface
            }
        }
    }

    private var cardBorder: Color {
        guard let s = status else { return Theme.border }
        if s.isWon  { return Theme.green.opacity(0.3) }
        if s.isLost { return Theme.red.opacity(0.2) }
        return Theme.border
    }

    private var modeColor: Color {
        switch mode {
        case .film:   return Theme.modeFilm
        case .series: return Theme.modeSeries
        case .wiki:   return Theme.modeWiki
        }
    }

    private var modeIcon: String {
        switch mode {
        case .film:   return "film"
        case .series: return "tv"
        case .wiki:   return "building.columns"
        }
    }
}

// MARK: - 4. Countdown

private struct MidnightCountdown: View {
    @State private var timeRemaining = ""
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 6) {
            Text("Prochain défi dans")
                .font(.system(size: 11, weight: .medium))
                .tracking(0.5)
                .foregroundColor(Theme.muted)
            Text(timeRemaining)
                .font(.system(size: 28, weight: .bold, design: .monospaced))
                .foregroundColor(Theme.text.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.spacing16)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        .onReceive(timer) { _ in timeRemaining = countdown() }
        .onAppear { timeRemaining = countdown() }
    }

    private func countdown() -> String {
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

// MARK: - 5. Friends snippet

private struct FriendsSnippet: View {
    let count: Int

    var body: some View {
        NavigationLink(destination: FriendsView()) {
            HStack(spacing: Theme.spacing12) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 15))
                    .foregroundColor(Theme.textDim)
                Text("\(count) ami\(count > 1 ? "s" : "") ont déjà joué aujourd'hui")
                    .font(.system(size: 14))
                    .foregroundColor(Theme.textDim)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Theme.muted)
            }
            .padding(.horizontal, Theme.spacing16)
            .padding(.vertical, Theme.spacing12)
            .background(Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}
