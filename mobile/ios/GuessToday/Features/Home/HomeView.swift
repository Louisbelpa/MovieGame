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
    var failedModes: Set<GameMode> = []
    var noChallengeModes: Set<GameMode> = []
    var friendsPlayedCount: Int? = nil
    var isLoading = false

    private let orderedModes: [GameMode] = [.film, .series, .wiki]

    func load(isRefresh: Bool = false) async {
        if !isRefresh { isLoading = true }
        defer { isLoading = false }
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadStatuses(isRefresh: isRefresh) }
            group.addTask { await self.loadFriends() }
            group.addTask { await StatsManager.shared.refreshFromServer() }
        }
        refreshStats()
    }

    private func loadStatuses(isRefresh: Bool = false) async {
        await withTaskGroup(of: (GameMode, DailyChallengeStatus?, Bool).self) { group in
            for mode in orderedModes {
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
                        ), false)
                    } catch let e as APIError {
                        let isNotFound: Bool
                        if case .httpError(let code, _) = e, code == 404 { isNotFound = true } else { isNotFound = false }
                        return (mode, nil, isNotFound)
                    } catch {
                        return (mode, nil, false)
                    }
                }
            }
            for await (mode, status, isNotFound) in group {
                if let status {
                    statuses[mode] = status
                    failedModes.remove(mode)
                    noChallengeModes.remove(mode)
                } else if isNotFound {
                    noChallengeModes.insert(mode)
                    failedModes.remove(mode)
                    statuses.removeValue(forKey: mode)
                } else {
                    // On refresh: keep existing status silently — task cancellation or transient
                    // network errors must not wipe cards that were loaded correctly before.
                    if isRefresh && statuses[mode] != nil {
                        continue
                    }
                    // First load: only mark failed if not already a confirmed 404.
                    if !noChallengeModes.contains(mode) {
                        failedModes.insert(mode)
                    }
                }
            }
        }
    }

    func reload(mode: GameMode) async {
        failedModes.remove(mode)
        noChallengeModes.remove(mode)
        do {
            let payload: ChallengePayload = mode == .wiki
                ? try await APIClient.shared.todayWikiChallenge()
                : try await APIClient.shared.todayChallenge(type: mode.apiType)
            let s = await StatsManager.shared.stats(for: mode)
            statuses[mode] = DailyChallengeStatus(
                mode: mode,
                challengeNumber: payload.challengeNumber,
                outcome: payload.outcome,
                attemptsUsed: payload.attemptsUsed,
                maxAttempts: payload.maxAttempts,
                streak: s.currentStreak,
                wins: s.wins,
                gamesPlayed: s.gamesPlayed,
                maxStreak: s.maxStreak
            )
        } catch let e as APIError {
            if case .httpError(let code, _) = e, code == 404 {
                noChallengeModes.insert(mode)
            } else {
                failedModes.insert(mode)
            }
        } catch {
            failedModes.insert(mode)
        }
    }

    private func loadFriends() async {
        let today = todayParis()
        if let payload = try? await APIClient.shared.friends(date: today) {
            let played = payload.friends.filter { entry in
                !entry.isMe &&
                (entry.scores.film != nil || entry.scores.series != nil || entry.scores.wiki != nil)
            }.count
            friendsPlayedCount = played > 0 ? played : nil
        }
    }

    func refreshStats() {
        for mode in orderedModes {
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
    var totalPlayed: Int    { statuses.values.map(\.gamesPlayed).max() ?? 0 }
    var totalWins: Int      { statuses.values.map(\.wins).max() ?? 0 }

    var nextToPlayMode: GameMode? {
        orderedModes.first { mode in
            !failedModes.contains(mode) &&
            (statuses[mode] == nil || statuses[mode]?.isPlayed == false)
        }
    }

    private func todayParis() -> String {
        DateFormatter.parisDate.string(from: Date())
    }
}

// MARK: - View

struct HomeView: View {
    @Environment(\.scenePhase) private var scenePhase
    @Environment(DeepLinkRouter.self) private var router
    @State private var vm = HomeViewModel()
    @State private var selectedMode: GameMode? = nil
    @State private var deepLinkDate: String? = nil
    @State private var cardsAppeared = true
    private var statsManager: StatsManager { StatsManager.shared }

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Theme.background.ignoresSafeArea()

                // Ambient glow — mirrors web radial-gradient
                GeometryReader { geo in
                    ZStack {
                        RadialGradient(
                            colors: [Theme.modeFilm.opacity(0.10), .clear],
                            center: UnitPoint(x: 0.1, y: 0.04),
                            startRadius: 0,
                            endRadius: geo.size.width * 0.7
                        )
                        RadialGradient(
                            colors: [Theme.modeSeries.opacity(0.07), .clear],
                            center: UnitPoint(x: 0.92, y: 0.88),
                            startRadius: 0,
                            endRadius: geo.size.width * 0.65
                        )
                    }
                }
                .ignoresSafeArea()
                .allowsHitTesting(false)

                ScrollView {
                    VStack(spacing: 0) {
                        // ── Header ──────────────────────────────
                        HomeHeaderBar()
                            .padding(.horizontal, Theme.spacing16)
                            .padding(.top, Theme.spacing8)
                            .padding(.bottom, Theme.spacing20)

                        // ── Hero ────────────────────────────────
                        HeroSection(vm: vm)
                            .padding(.horizontal, Theme.spacing16)
                            .padding(.bottom, Theme.spacing24)

                        // ── Défis section ───────────────────────
                        VStack(spacing: Theme.spacing8) {
                            ChallengesSectionHeader(vm: vm)
                                .padding(.horizontal, Theme.spacing16)

                            ForEach([GameMode.film, .series, .wiki], id: \.title) { mode in
                                DayChallengeCard(
                                    mode: mode,
                                    status: vm.statuses[mode],
                                    isLoading: vm.isLoading,
                                    loadFailed: vm.failedModes.contains(mode),
                                    noChallenge: vm.noChallengeModes.contains(mode),
                                    isNextToPlay: !vm.isLoading && vm.nextToPlayMode == mode,
                                    onRetry: { Task { await vm.reload(mode: mode) } }
                                ) { selectedMode = mode }
                                .padding(.horizontal, Theme.spacing16)
                            }
                        }
                        .opacity(cardsAppeared ? 1 : 0)
                        .offset(y: cardsAppeared ? 0 : 18)
                        .padding(.bottom, Theme.spacing20)

                        // ── Stats + Countdown ────────────────────
                        StatsCountdownBar(vm: vm)
                            .padding(.horizontal, Theme.spacing16)
                            .padding(.bottom, Theme.spacing16)

                        // ── Friends snippet ──────────────────────
                        if let count = vm.friendsPlayedCount {
                            FriendsSnippet(count: count)
                                .padding(.horizontal, Theme.spacing16)
                                .padding(.bottom, Theme.spacing24)
                        }

                        // ── Notification promo ──────────────────────────────────────
                        NotificationPromoCard()
                            .padding(.horizontal, Theme.spacing16)
                            .padding(.bottom, Theme.spacing16)

                        Spacer(minLength: Theme.spacing24)
                    }
                    .animation(.easeInOut(duration: 0.3), value: vm.isLoading)
                }
                .refreshable { await vm.load(isRefresh: true) }
            }
            .navigationBarHidden(true)
            .navigationDestination(item: $selectedMode) { mode in
                GameView(mode: mode, initialDate: deepLinkDate)
                    .onDisappear { deepLinkDate = nil }
            }
        }
        .onAppear { Task { await vm.load() } }
        .onChange(of: router.trigger) { _, _ in
            guard let mode = router.pendingMode else { return }
            deepLinkDate = router.pendingDate
            selectedMode = mode
            router.consume()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await vm.load() } }
        }
        .onChange(of: selectedMode) { _, mode in
            // User returned from a game — animate cards back in and refresh statuses
            if mode == nil {
                cardsAppeared = false
                withAnimation(.spring(response: 0.45, dampingFraction: 0.78).delay(0.12)) {
                    cardsAppeared = true
                }
                Task { await vm.load(isRefresh: true) }
            }
        }
        .onChange(of: statsManager.filmStats.gamesPlayed)    { _, _ in vm.refreshStats() }
        .onChange(of: statsManager.seriesStats.gamesPlayed) { _, _ in vm.refreshStats() }
        .onChange(of: statsManager.wikiStats.gamesPlayed)   { _, _ in vm.refreshStats() }
        .onChange(of: statsManager.filmStats.currentStreak)   { _, _ in vm.refreshStats() }
        .onChange(of: statsManager.seriesStats.currentStreak) { _, _ in vm.refreshStats() }
        .onChange(of: statsManager.wikiStats.currentStreak)   { _, _ in vm.refreshStats() }
    }
}

// MARK: - Header bar

private struct HomeHeaderBar: View {
    @Environment(AuthViewModel.self) var auth

    var body: some View {
        HStack(alignment: .center) {
            ApertureLockup(iconSize: 22, fontSize: 22)

            Spacer()

            // Avatar / profile
            if auth.isLoggedIn, let user = auth.user {
                NavigationLink(destination: ProfileView()) {
                    Group {
                        if let url = user.avatarUrl, let imageURL = URL(string: url.hasPrefix("/") ? APIClient.baseURL + url : url) {
                            AsyncImage(url: imageURL) { img in
                                img.resizable().scaledToFill()
                            } placeholder: {
                                Text(user.displayName.prefix(1).uppercased())
                                    .font(Theme.inter(size: 13, weight: .bold))
                                    .foregroundColor(Theme.gold)
                            }
                        } else {
                            Text(user.displayName.prefix(1).uppercased())
                                .font(Theme.inter(size: 13, weight: .bold))
                                .foregroundColor(Theme.gold)
                        }
                    }
                    .frame(width: 32, height: 32)
                    .background(Theme.gold.opacity(0.18))
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Theme.gold.opacity(0.35), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

// MARK: - Hero section

private struct HeroSection: View {
    let vm: HomeViewModel

    private var todayLabel: String {
        Date().formatted(
            .dateTime
                .weekday(.wide)
                .day()
                .month(.wide)
                .locale(Locale(identifier: "fr_FR"))
        ).capitalized
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            // Date
            Text(todayLabel.uppercased())
                .font(Theme.inter(size: 10, weight: .semibold))
                .tracking(1.4)
                .foregroundColor(Theme.muted)

            // Hero headline
            Text("À toi de trouver.")
                .font(Theme.fraunces(size: 28))
                .foregroundColor(Theme.text)

            // Streak pill — only shown once streak data confirms a non-zero value
            if !vm.isLoading && vm.currentStreak > 0 {
                HStack(spacing: 5) {
                    Text("🔥")
                        .font(.system(size: 13))
                    Text("\(vm.currentStreak) jour\(vm.currentStreak > 1 ? "s" : "") de série")
                        .font(Theme.inter(size: 12, weight: .semibold))
                        .foregroundColor(Color(hex: "#f59e0b"))
                }
                .padding(.horizontal, 11)
                .padding(.vertical, 6)
                .background(Color(hex: "#FEF3E2"))
                .cornerRadius(100)
                .overlay(
                    Capsule().stroke(Color(hex: "#f59e0b").opacity(0.22), lineWidth: 1)
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Challenges section header

private struct ChallengesSectionHeader: View {
    let vm: HomeViewModel

    var body: some View {
        HStack {
            Text("DÉFIS DU JOUR")
                .font(Theme.inter(size: 11, weight: .semibold))
                .tracking(1.4)
                .foregroundColor(Theme.muted)
            Spacer()
            if vm.isLoading {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Theme.surfaceAlt)
                    .frame(width: 36, height: 12)
                    .shimmer()
            } else {
                let c = vm.completedToday
                let total = vm.statuses.count
                HStack(spacing: 4) {
                    Text("\(c)/\(total)")
                        .font(Theme.inter(size: 12, weight: .semibold))
                        .foregroundColor(total > 0 && c == total ? Theme.green : Theme.textDim)
                    if c > 0 {
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(total > 0 && c == total ? Theme.green : Theme.textDim)
                    }
                }
            }
        }
    }
}

// MARK: - Challenge card

private struct DayChallengeCard: View {
    let mode: GameMode
    let status: DailyChallengeStatus?
    let isLoading: Bool
    let loadFailed: Bool
    let noChallenge: Bool
    let isNextToPlay: Bool
    let onRetry: () -> Void
    let onTap: () -> Void

    var body: some View {
        Button(action: {
            if noChallenge { return }
            if loadFailed { onRetry() } else { onTap() }
        }) {
            HStack(spacing: 14) {
                // Icon square with gradient background
                ZStack {
                    RoundedRectangle(cornerRadius: 11)
                        .fill(iconBackground)
                    Image(systemName: modeIcon)
                        .font(.system(size: 17, weight: .medium))
                        .foregroundColor(modeColor)
                }
                .frame(width: 44, height: 44)

                // Labels
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 5) {
                        Text(modeLabel.uppercased())
                            .font(Theme.inter(size: 10, weight: .semibold))
                            .tracking(0.8)
                            .foregroundColor(modeColor)
                        if let n = status?.challengeNumber {
                            Text("#\(n)")
                                .font(Theme.inter(size: 10))
                                .foregroundColor(Theme.muted)
                        }
                    }

                    if isLoading && status == nil && !loadFailed && !noChallenge {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Theme.surfaceAlt)
                            .frame(width: 110, height: 14)
                            .shimmer()
                    } else if noChallenge {
                        Text("Pas de défi aujourd'hui")
                            .font(Theme.inter(size: 14, weight: .semibold))
                            .foregroundColor(Theme.muted)
                    } else if loadFailed {
                        Text("Impossible de charger")
                            .font(Theme.inter(size: 14, weight: .semibold))
                            .foregroundColor(Theme.red)
                    } else if let s = status {
                        Text(mainLabel(s))
                            .font(Theme.inter(size: 15, weight: .semibold))
                            .foregroundColor(mainLabelColor(s))
                        if s.isWon || s.isLost {
                            Text(subLabel(s))
                                .font(Theme.inter(size: 11))
                                .foregroundColor(Theme.muted)
                        }
                    } else {
                        Text(isNextToPlay ? "À jouer maintenant" : "À jouer")
                            .font(Theme.inter(size: 15, weight: .semibold))
                            .foregroundColor(isNextToPlay ? Theme.text : Theme.textDim)
                        Text(modeDescription)
                            .font(Theme.inter(size: 11))
                            .foregroundColor(Theme.muted)
                            .lineLimit(1)
                    }
                }

                Spacer()

                rightAction
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .background(cardBackground)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(borderColor, lineWidth: isNextToPlay ? 1.5 : 1)
            )
        }
        .buttonStyle(CardPressStyle())
        .disabled(noChallenge)
    }

    // MARK: - Right action

    @ViewBuilder
    private var rightAction: some View {
        if noChallenge {
            Image(systemName: "moon.zzz")
                .font(.system(size: 14))
                .foregroundColor(Theme.muted.opacity(0.5))
        } else if loadFailed {
            Image(systemName: "arrow.clockwise")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Theme.muted)
        } else if let s = status {
            if s.isWon {
                ZStack {
                    Circle()
                        .fill(Theme.green.opacity(0.15))
                        .frame(width: 32, height: 32)
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Theme.green)
                }
            } else if s.isLost {
                ZStack {
                    Circle()
                        .fill(Theme.red.opacity(0.12))
                        .frame(width: 32, height: 32)
                    Image(systemName: "xmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Theme.red.opacity(0.7))
                }
            } else {
                // In progress
                HStack(spacing: 4) {
                    Text("Continuer")
                        .font(Theme.inter(size: 12, weight: .semibold))
                    Text("→")
                        .font(Theme.inter(size: 12, weight: .semibold))
                }
                .foregroundColor(modeColor)
                .padding(.horizontal, 11)
                .padding(.vertical, 7)
                .background(modeColor.opacity(0.12))
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(modeColor.opacity(0.22), lineWidth: 1))
            }
        } else if isLoading {
            RoundedRectangle(cornerRadius: 8)
                .fill(Theme.surfaceAlt)
                .frame(width: 68, height: 30)
                .shimmer()
        } else if isNextToPlay {
            HStack(spacing: 4) {
                Text("Jouer")
                    .font(Theme.inter(size: 13, weight: .semibold))
                Text("→")
                    .font(Theme.inter(size: 13, weight: .semibold))
            }
            .foregroundColor(mode == .film ? Theme.primaryButtonFg : .white)
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(isNextToPlayBackground)
            .cornerRadius(10)
        } else {
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.muted.opacity(0.6))
        }
    }

    private var isNextToPlayBackground: some ShapeStyle {
        if mode == .film {
            return AnyShapeStyle(LinearGradient(
                colors: [Color(hex: "#D4900F"), Color(hex: "#C07C0A"), Color(hex: "#8A5500")],
                startPoint: .top, endPoint: .bottom
            ))
        }
        return AnyShapeStyle(modeColor)
    }

    // MARK: - Labels & colors

    private func mainLabel(_ s: DailyChallengeStatus) -> String {
        if s.isWon  { return "Gagné !" }
        if s.isLost { return "Pas trouvé" }
        if s.isInProgress { return "En cours…" }
        return "À jouer"
    }

    private func subLabel(_ s: DailyChallengeStatus) -> String {
        if s.isWon  { return "En \(s.attemptsUsed)/\(s.maxAttempts) tentative\(s.attemptsUsed > 1 ? "s" : "")" }
        if s.isLost { return "Toutes les tentatives épuisées" }
        return ""
    }

    private func mainLabelColor(_ s: DailyChallengeStatus) -> Color {
        if s.isWon  { return Theme.green }
        if s.isLost { return Theme.red }
        if s.isInProgress { return modeColor }
        return Theme.textDim
    }

    private var iconBackground: LinearGradient {
        LinearGradient(
            colors: [modeColor.opacity(0.22), modeColor.opacity(0.10)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var cardBackground: Color {
        if let s = status {
            if s.isWon  { return Theme.green.opacity(0.10) }
            if s.isLost { return Theme.red.opacity(0.08) }
        }
        if isNextToPlay { return Theme.surface }
        return Theme.surface
    }

    private var borderColor: Color {
        if noChallenge { return Theme.border }
        if loadFailed  { return Theme.red.opacity(0.25) }
        if let s = status {
            if s.isWon  { return Theme.green.opacity(0.30) }
            if s.isLost { return Theme.red.opacity(0.22) }
        }
        if isNextToPlay { return modeColor.opacity(0.55) }
        return modeColor.opacity(0.22)
    }

    private var modeColor: Color { mode.color }

    private var modeIcon: String { mode.icon }

    private var modeLabel: String {
        switch mode {
        case .film:   return "Films"
        case .series: return "Séries"
        case .wiki:   return "Personnalités"
        }
    }

    private var modeDescription: String {
        switch mode {
        case .film:   return "Identifie le film depuis une scène"
        case .series: return "Identifie la série depuis une scène"
        case .wiki:   return "Devine la personnalité du jour"
        }
    }
}

// MARK: - Stats + countdown bar

private struct StatsCountdownBar: View {
    let vm: HomeViewModel

    var body: some View {
        HStack(spacing: 0) {
            StatCell(
                value: vm.isLoading ? "—" : "\(vm.totalPlayed)",
                label: "JOUÉS",
                isLoading: vm.isLoading
            )

            Divider()
                .frame(width: 1, height: 36)
                .background(Theme.border)

            let wins = vm.isLoading ? 0 : vm.totalWins
            let played = vm.isLoading ? 1 : max(1, vm.totalPlayed)
            StatCell(
                value: vm.isLoading ? "—" : "\(Int(round(Double(wins) / Double(played) * 100)))%",
                label: "VICTOIRES",
                isLoading: vm.isLoading
            )

            Divider()
                .frame(width: 1, height: 36)
                .background(Theme.border)

            CountdownCell()
        }
        .padding(.vertical, Theme.spacing12)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusL)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusL).stroke(Theme.border, lineWidth: 1))
    }
}

private struct StatCell: View {
    let value: String
    let label: String
    var isLoading: Bool = false

    var body: some View {
        VStack(spacing: 3) {
            if isLoading {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Theme.surfaceAlt)
                    .frame(width: 36, height: 22)
                    .shimmer()
            } else {
                Text(value)
                    .font(Theme.fraunces(size: 22))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(hex: "#D4900F"), Color(hex: "#C07C0A")],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
            }
            Text(label)
                .font(Theme.inter(size: 9, weight: .semibold))
                .tracking(1.1)
                .foregroundColor(Theme.muted)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct CountdownCell: View {
    @State private var timeRemaining = ""
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 3) {
            Text(timeRemaining)
                .font(Theme.inter(size: 18, weight: .bold))
                .foregroundColor(Theme.text)
                .monospacedDigit()
            Text("PROCHAIN DÉFI")
                .font(Theme.inter(size: 9, weight: .semibold))
                .tracking(1.1)
                .foregroundColor(Theme.muted)
        }
        .frame(maxWidth: .infinity)
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

// MARK: - Friends snippet

private struct FriendsSnippet: View {
    let count: Int

    private let avatarColors: [Color] = [
        Theme.modeSeries,
        Theme.green,
        Theme.modeWiki,
        Theme.amber,
        Color(hex: "#38bdf8"),
    ]

    var body: some View {
        NavigationLink(destination: FriendsView()) {
            HStack(spacing: Theme.spacing12) {
                AvatarStack(count: min(count, 4), colors: avatarColors)

                VStack(alignment: .leading, spacing: 2) {
                    Text("\(count) ami\(count > 1 ? "s" : "") ont déjà joué")
                        .font(Theme.inter(size: 14, weight: .semibold))
                        .foregroundColor(Theme.text)
                    Text("Voir leur score du jour →")
                        .font(Theme.inter(size: 12))
                        .foregroundColor(Theme.textDim)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Theme.muted)
            }
            .padding(.horizontal, Theme.spacing16)
            .padding(.vertical, Theme.spacing14)
            .background(Theme.surface)
            .cornerRadius(Theme.radiusL)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusL).stroke(Theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

private struct AvatarStack: View {
    let count: Int
    let colors: [Color]
    private let size: CGFloat = 28
    private let overlap: CGFloat = 10

    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<count, id: \.self) { i in
                Circle()
                    .fill(colors[i % colors.count])
                    .frame(width: size, height: size)
                    .overlay(Circle().stroke(Theme.surface, lineWidth: 2))
                    .offset(x: i == 0 ? 0 : -overlap * CGFloat(i))
                    .zIndex(Double(count - i))
            }
        }
        .frame(width: size + CGFloat(max(0, count - 1)) * (size - overlap), alignment: .leading)
    }
}
