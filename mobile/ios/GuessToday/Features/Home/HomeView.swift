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
        #if DEBUG || NRT
        if FeatureFlags.shared.useMockData {
            loadMockStatuses()
            isLoading = false
            return
        }
        #endif
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

    #if DEBUG || NRT
    private func loadMockStatuses() {
        for mode in orderedModes {
            let m = MockData.hubStatus(for: mode)
            let s = MockData.localStats(for: mode)
            statuses[mode] = DailyChallengeStatus(
                mode: mode, challengeNumber: m.number, outcome: m.outcome,
                attemptsUsed: m.attemptsUsed, maxAttempts: 5,
                streak: s.currentStreak, wins: s.wins, gamesPlayed: s.gamesPlayed, maxStreak: s.maxStreak
            )
        }
        failedModes.removeAll(); noChallengeModes.removeAll()
        friendsPlayedCount = 3
    }
    #endif

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
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.spacing16) {
                        // ── Header compact ──────────────────────
                        HomeHeaderBar(vm: vm)
                            .padding(.top, Theme.spacing4)

                        // ── Page header ─────────────────────────
                        HubPageHeader(vm: vm)

                        // ── Progression du jour ─────────────────
                        DayProgressChip(vm: vm)

                        // ── 3 cartes de jeu (sans spoiler) ──────
                        VStack(spacing: Theme.spacing12) {
                            ForEach([GameMode.film, .series, .wiki], id: \.title) { mode in
                                CandyGameCard(
                                    mode: mode,
                                    status: vm.statuses[mode],
                                    isLoading: vm.isLoading,
                                    loadFailed: vm.failedModes.contains(mode),
                                    noChallenge: vm.noChallengeModes.contains(mode),
                                    isNextToPlay: !vm.isLoading && vm.nextToPlayMode == mode,
                                    onRetry: { Task { await vm.reload(mode: mode) } }
                                ) { selectedMode = mode }
                            }
                        }
                        .opacity(cardsAppeared ? 1 : 0)
                        .offset(y: cardsAppeared ? 0 : 18)

                        // ── Récap score du jour ─────────────────
                        ScoreRecapCard(vm: vm)

                        // ── Amis ────────────────────────────────
                        if let count = vm.friendsPlayedCount {
                            FriendsSnippet(count: count)
                        }

                        NotificationPromoCard()

                        Spacer(minLength: Theme.spacing16)
                    }
                    .padding(.horizontal, Theme.spacing16)
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
            // Logo glyphe Candy
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(Theme.coral)
                    .frame(width: 30, height: 30)
                    .overlay(Image(systemName: "sparkles").font(.system(size: 15, weight: .bold)).foregroundColor(.white))
                    .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(Theme.coralDark).offset(y: 3))
                Text("GuessToday")
                    .font(Theme.fraunces(size: 19))
                    .foregroundColor(Theme.ink)
            }

            Spacer()

            // Pastille série
            if !vm.isLoading && vm.currentStreak > 0 {
                HStack(spacing: 4) {
                    Text("🔥").font(.system(size: 12))
                    Text("\(vm.currentStreak)")
                        .font(Theme.mono(size: 13, weight: .bold))
                }
                .foregroundColor(Theme.flame)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(
                    Capsule().fill(Theme.flameSoft)
                        .background(Capsule().fill(Color(hex: "#ffe2bd")).offset(y: 3))
                )
            }

            // Avatar
            NavigationLink(destination: ProfileView()) {
                Group {
                    if let user = auth.user, let url = user.avatarUrl,
                       let imageURL = URL(string: url.hasPrefix("/") ? APIClient.baseURL + url : url) {
                        AsyncImage(url: imageURL) { img in img.resizable().scaledToFill() } placeholder: {
                            Text(user.displayName.prefix(1).uppercased())
                                .font(Theme.inter(size: 14, weight: .bold)).foregroundColor(.white)
                        }
                    } else if let user = auth.user {
                        Text(user.displayName.prefix(1).uppercased())
                            .font(Theme.inter(size: 14, weight: .bold)).foregroundColor(.white)
                    } else {
                        Image(systemName: "person.fill").font(.system(size: 15, weight: .bold)).foregroundColor(.white)
                    }
                }
                .frame(width: 34, height: 34)
                .background(Circle().fill(Theme.grape))
                .background(Circle().fill(Theme.grapeDark).offset(y: 3))
                .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - Page header

private struct HubPageHeader: View {
    @Environment(AuthViewModel.self) var auth
    let vm: HomeViewModel

    private var firstName: String {
        guard let name = auth.user?.displayName, !name.isEmpty else { return "toi" }
        return name.split(separator: " ").first.map(String.init) ?? name
    }
    private var todayLabel: String {
        Date().formatted(.dateTime.weekday(.wide).day().month(.wide).locale(Locale(identifier: "fr_FR"))).capitalized
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Salut \(firstName) 👋")
                .font(Theme.fraunces(size: 27))
                .foregroundColor(Theme.ink)
            Text(todayLabel)
                .font(Theme.mono(size: 12, weight: .medium))
                .foregroundColor(Theme.ink2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Day progress chip

private struct DayProgressChip: View {
    let vm: HomeViewModel
    private let modes: [GameMode] = [.film, .series, .wiki]

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Défis du jour")
                    .font(Theme.inter(size: 15, weight: .semibold))
                    .foregroundColor(Theme.ink)
                Text("\(vm.completedToday)/\(modes.count) terminé\(vm.completedToday > 1 ? "s" : "")")
                    .font(Theme.mono(size: 11, weight: .medium))
                    .foregroundColor(Theme.ink2)
            }
            Spacer()
            HStack(spacing: 8) {
                ForEach(modes, id: \.title) { mode in
                    let done = vm.statuses[mode]?.isPlayed ?? false
                    Circle()
                        .fill(done ? Theme.correct : Theme.line)
                        .frame(width: 12, height: 12)
                        .background(done ? Circle().fill(Theme.correctDark).offset(y: 2) : nil)
                }
            }
        }
        .padding(Theme.spacing16)
        .candyCard(radius: Theme.radiusM)
    }
}

// MARK: - Candy game card (en-tête coloré + corps, SANS image — anti-spoiler)

private struct CandyGameCard: View {
    let mode: GameMode
    let status: DailyChallengeStatus?
    let isLoading: Bool
    let loadFailed: Bool
    let noChallenge: Bool
    let isNextToPlay: Bool
    let onRetry: () -> Void
    let onTap: () -> Void

    private var isDone: Bool { status?.isWon == true || status?.isLost == true }

    var body: some View {
        Button(action: {
            if noChallenge { return }
            if loadFailed { onRetry() } else { onTap() }
        }) {
            VStack(spacing: 0) {
                // En-tête coloré
                HStack(spacing: Theme.spacing12) {
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .fill(Color.white.opacity(0.22))
                        .frame(width: 44, height: 44)
                        .overlay(Image(systemName: mode.iconFilled).font(.system(size: 20, weight: .bold)).foregroundColor(.white))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(mode.title)
                            .font(Theme.fraunces(size: 18))
                            .foregroundColor(.white)
                        if let n = status?.challengeNumber {
                            Text("Défi #\(n)")
                                .font(Theme.mono(size: 11, weight: .semibold))
                                .foregroundColor(.white.opacity(0.85))
                        }
                    }
                    Spacer()
                    statusBadge
                }
                .padding(Theme.spacing14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(mode.color)

                // Corps
                bodyContent
                    .padding(Theme.spacing14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.panel)
            }
            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusL, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusL, style: .continuous).strokeBorder(Theme.line, lineWidth: 2.5))
            .background(RoundedRectangle(cornerRadius: Theme.radiusL, style: .continuous).fill(Theme.line2).offset(y: 6))
        }
        .buttonStyle(CardPressStyle())
        .disabled(noChallenge)
    }

    @ViewBuilder private var statusBadge: some View {
        if isDone {
            HStack(spacing: 4) {
                Image(systemName: "checkmark").font(.system(size: 10, weight: .bold))
                Text("Fini").font(Theme.inter(size: 12, weight: .semibold))
            }
            .foregroundColor(mode.color)
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(Capsule().fill(.white))
        } else if status?.isInProgress == true {
            Text("En cours").font(Theme.inter(size: 12, weight: .semibold))
                .foregroundColor(.white).padding(.horizontal, 10).padding(.vertical, 5)
                .background(Capsule().fill(Color.white.opacity(0.22)))
        } else if !noChallenge {
            Text("À jouer").font(Theme.inter(size: 12, weight: .semibold))
                .foregroundColor(.white).padding(.horizontal, 10).padding(.vertical, 5)
                .background(Capsule().fill(Color.white.opacity(0.22)))
        }
    }

    @ViewBuilder private var bodyContent: some View {
        if isLoading && status == nil && !loadFailed && !noChallenge {
            RoundedRectangle(cornerRadius: 6).fill(Theme.surfaceAlt).frame(height: 28).shimmer()
        } else if noChallenge {
            Text("Pas de défi aujourd'hui").font(Theme.inter(size: 13)).foregroundColor(Theme.ink2)
        } else if loadFailed {
            Text("Impossible de charger — Toucher pour réessayer").font(Theme.inter(size: 13)).foregroundColor(Theme.wrong)
        } else if let s = status, isDone {
            HStack {
                AttemptPips(used: s.attemptsUsed, won: s.isWon, max: s.maxAttempts, mode: mode)
                Spacer()
                HStack(spacing: 4) {
                    Text(s.isWon ? "Gagné" : "Perdu")
                        .font(Theme.inter(size: 13, weight: .semibold))
                        .foregroundColor(s.isWon ? Theme.correctDark : Theme.wrongDark)
                    Image(systemName: "arrow.right").font(.system(size: 11, weight: .bold)).foregroundColor(Theme.ink3)
                }
            }
        } else {
            HStack {
                Text(status?.isInProgress == true ? "Continue ta partie" : "Devine le défi du jour")
                    .font(Theme.inter(size: 13)).foregroundColor(Theme.ink2)
                Spacer()
                HStack(spacing: 5) {
                    Text(status?.isInProgress == true ? "Continuer" : "Jouer")
                        .font(Theme.inter(size: 14, weight: .bold))
                    Image(systemName: "arrow.right").font(.system(size: 12, weight: .bold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 14).padding(.vertical, 9)
                .background(
                    Capsule().fill(mode.color)
                        .background(Capsule().fill(mode.accentDark).offset(y: 3))
                )
            }
        }
    }
}

private struct AttemptPips: View {
    let used: Int
    let won: Bool
    let max: Int
    let mode: GameMode

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<max, id: \.self) { i in
                Circle()
                    .fill(color(for: i))
                    .frame(width: 11, height: 11)
            }
        }
    }

    private func color(for i: Int) -> Color {
        guard i < used else { return Theme.line2 }
        // dernière tentative = correcte si gagné, sinon ratée
        if won && i == used - 1 { return Theme.correct }
        return won ? mode.color : Theme.wrong
    }
}

// MARK: - Récap score du jour

private struct ScoreRecapCard: View {
    let vm: HomeViewModel

    var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 4) {
                Text("TON SCORE DU JOUR")
                    .font(Theme.mono(size: 11, weight: .bold))
                    .tracking(1.1)
                    .foregroundColor(Theme.ink2)
                Text("\(vm.completedToday)/3 jeux")
                    .font(Theme.fraunces(size: 24))
                    .foregroundColor(Theme.ink)
            }
            Spacer()
            CountdownCell()
                .frame(width: 130)
        }
        .padding(Theme.spacing16)
        .candyCard(radius: Theme.radiusM, fill: Theme.coralSoft, border: Theme.coralSoft, shadow: Color(hex: "#f7cbb8"))
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
