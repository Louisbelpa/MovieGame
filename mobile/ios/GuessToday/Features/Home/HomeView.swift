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
                        HomeHeaderBar(vm: vm)
                            .padding(.horizontal, Theme.spacing16)
                            .padding(.top, Theme.spacing8)
                            .padding(.bottom, Theme.spacing16)

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
    let vm: HomeViewModel

    var body: some View {
        HStack(spacing: Theme.spacing8) {
            // Logo lockup — mirrors web Header
            ApertureLockup(iconSize: 22, fontSize: 22)

            Spacer()

            // Streak pill — mirrors web Header desktop pill
            if !vm.isLoading && vm.currentStreak > 0 {
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 10))
                    Text("\(vm.currentStreak)j")
                        .font(Theme.inter(size: 11, weight: .semibold))
                }
                .foregroundColor(Theme.amber)
                .padding(.horizontal, 9)
                .padding(.vertical, 5)
                .background(Theme.amber.opacity(0.12))
                .cornerRadius(20)
                .overlay(Capsule().stroke(Theme.amber.opacity(0.25), lineWidth: 1))
            }

            // Avatar or login icon
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
                    .overlay(Circle().stroke(Theme.gold.opacity(0.38), lineWidth: 1))
                }
                .buttonStyle(.plain)
            } else {
                NavigationLink(destination: ProfileView()) {
                    Image(systemName: "person.circle")
                        .font(.system(size: 22))
                        .foregroundColor(Theme.textDim)
                        .frame(width: 36, height: 36)
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
        VStack(alignment: .leading, spacing: 6) {
            Text(todayLabel.uppercased())
                .font(Theme.inter(size: 10, weight: .semibold))
                .tracking(1.4)
                .foregroundColor(Theme.muted)

            Text("À toi de trouver.")
                .font(Theme.fraunces(size: 26))
                .foregroundColor(Theme.text)
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

// MARK: - Challenge card (immersive, aligned with web homepage cards)

private struct DayChallengeCard: View {
    let mode: GameMode
    let status: DailyChallengeStatus?
    let isLoading: Bool
    let loadFailed: Bool
    let noChallenge: Bool
    let isNextToPlay: Bool
    let onRetry: () -> Void
    let onTap: () -> Void

    private var modeColor: Color { mode.color }

    var body: some View {
        Button(action: {
            if noChallenge { return }
            if loadFailed { onRetry() } else { onTap() }
        }) {
            ZStack(alignment: .topLeading) {
                // Atmospheric background — radial glow at top like web `atmosphere-film`
                GeometryReader { geo in
                    ZStack {
                        Theme.surface
                        RadialGradient(
                            colors: [modeColor.opacity(0.13), .clear],
                            center: UnitPoint(x: 0.5, y: -0.1),
                            startRadius: 0,
                            endRadius: geo.size.width * 0.85
                        )
                    }
                }

                VStack(alignment: .leading, spacing: 0) {
                    // Top row: icon + challenge number
                    HStack(alignment: .top) {
                        ZStack {
                            Circle()
                                .fill(modeColor.opacity(0.15))
                                .frame(width: 48, height: 48)
                            Circle()
                                .stroke(modeColor.opacity(0.22), lineWidth: 1)
                                .frame(width: 48, height: 48)
                            Image(systemName: modeIcon)
                                .font(.system(size: 20, weight: .medium))
                                .foregroundColor(modeColor)
                        }

                        Spacer()

                        if let n = status?.challengeNumber {
                            Text("#\(n)")
                                .font(Theme.inter(size: 11, weight: .medium))
                                .foregroundColor(Theme.textDim)
                                .padding(.top, 4)
                        }
                    }
                    .padding(.bottom, Theme.spacing12)

                    // Mode name
                    Text(modeLabel)
                        .font(Theme.fraunces(size: 22))
                        .foregroundColor(Theme.text)
                        .padding(.bottom, 4)

                    // Status / description line
                    statusLine
                        .padding(.bottom, Theme.spacing16)

                    // CTA
                    ctaRow
                }
                .padding(Theme.spacing16)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 168)
            .cornerRadius(18)
            .overlay(
                RoundedRectangle(cornerRadius: 18)
                    .stroke(borderColor, lineWidth: isNextToPlay ? 1.5 : 1)
            )
        }
        .buttonStyle(CardPressStyle())
        .disabled(noChallenge)
    }

    // MARK: - Status line

    @ViewBuilder
    private var statusLine: some View {
        if isLoading && status == nil && !loadFailed && !noChallenge {
            RoundedRectangle(cornerRadius: 3)
                .fill(Theme.surfaceAlt)
                .frame(width: 120, height: 12)
                .shimmer()
        } else if noChallenge {
            Text("Pas de défi aujourd'hui")
                .font(Theme.inter(size: 13))
                .foregroundColor(Theme.muted)
        } else if loadFailed {
            Text("Impossible de charger — Réessayer")
                .font(Theme.inter(size: 13))
                .foregroundColor(Theme.red)
        } else if let s = status, s.isWon {
            HStack(spacing: 5) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.green)
                Text("Gagné en \(s.attemptsUsed)/\(s.maxAttempts)")
                    .font(Theme.inter(size: 13))
                    .foregroundColor(Theme.green)
            }
        } else if let s = status, s.isLost {
            HStack(spacing: 5) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.red.opacity(0.8))
                Text("Non trouvé")
                    .font(Theme.inter(size: 13))
                    .foregroundColor(Theme.red.opacity(0.8))
            }
        } else if let s = status, s.isInProgress {
            Text("En cours — \(s.maxAttempts - s.attemptsUsed) essai\(s.maxAttempts - s.attemptsUsed > 1 ? "s" : "") restant\(s.maxAttempts - s.attemptsUsed > 1 ? "s" : "")")
                .font(Theme.inter(size: 13))
                .foregroundColor(modeColor)
        } else {
            Text(modeDescription)
                .font(Theme.inter(size: 13))
                .foregroundColor(Theme.textDim)
        }
    }

    // MARK: - CTA row

    @ViewBuilder
    private var ctaRow: some View {
        HStack {
            if !noChallenge {
                ctaButton
            }
            Spacer()
            // Streak pill if exists
            if let s = status, s.streak > 1 {
                HStack(spacing: 3) {
                    Text("🔥")
                        .font(.system(size: 11))
                    Text("\(s.streak)")
                        .font(Theme.inter(size: 11, weight: .semibold))
                        .foregroundColor(Theme.amber)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Theme.amber.opacity(0.10))
                .cornerRadius(20)
            }
        }
    }

    @ViewBuilder
    private var ctaButton: some View {
        if isLoading && status == nil {
            RoundedRectangle(cornerRadius: 8)
                .fill(Theme.surfaceAlt)
                .frame(width: 80, height: 30)
                .shimmer()
        } else if loadFailed {
            EmptyView()
        } else if let s = status {
            if s.isWon || s.isLost {
                // Replay / see result
                HStack(spacing: 4) {
                    Text("Voir")
                        .font(Theme.inter(size: 12, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundColor(Theme.textDim)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(Theme.surfaceAlt)
                .cornerRadius(8)
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border, lineWidth: 1))
            } else {
                // In progress
                HStack(spacing: 4) {
                    Text("Continuer")
                        .font(Theme.inter(size: 12, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundColor(Theme.primaryButtonFg)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(modeColor)
                .cornerRadius(8)
            }
        } else if isNextToPlay {
            HStack(spacing: 4) {
                Text("Jouer")
                    .font(Theme.inter(size: 13, weight: .bold))
                Image(systemName: "arrow.right")
                    .font(.system(size: 12, weight: .bold))
            }
            .foregroundColor(Theme.primaryButtonFg)
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .background(modeColor)
            .cornerRadius(10)
        } else {
            HStack(spacing: 4) {
                Text("Jouer")
                    .font(Theme.inter(size: 12, weight: .semibold))
                Image(systemName: "arrow.right")
                    .font(.system(size: 11, weight: .semibold))
            }
            .foregroundColor(modeColor)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(modeColor.opacity(0.10))
            .cornerRadius(8)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(modeColor.opacity(0.25), lineWidth: 1))
        }
    }

    // MARK: - Colors & labels

    private var borderColor: Color {
        if noChallenge { return Theme.border }
        if loadFailed  { return Theme.red.opacity(0.30) }
        if let s = status {
            if s.isWon  { return Theme.green.opacity(0.30) }
            if s.isLost { return Theme.red.opacity(0.22) }
        }
        if isNextToPlay { return modeColor.opacity(0.60) }
        return modeColor.opacity(0.18)
    }

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
                            colors: [Theme.goldLight, Theme.gold],
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
