import SwiftUI

@Observable
@MainActor
final class FriendsViewModel {
    var payload: FriendsPayload?
    var isLoading = false
    var error: String?
    var addCode = ""
    var isAdding = false
    var addError: String?
    var addSuccess = false

    func load() async {
        isLoading = true
        error = nil
        do {
            payload = try await APIClient.shared.friends(date: nil)
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func addFriend() async {
        guard !addCode.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isAdding = true
        addError = nil
        do {
            try await APIClient.shared.addFriend(code: addCode.uppercased())
            addCode = ""
            addSuccess = true
            await load()
        } catch let e as APIError {
            addError = e.localizedDescription
        } catch {
            addError = error.localizedDescription
        }
        isAdding = false
    }

    func acceptFriend(userId: Int) async {
        do {
            try await APIClient.shared.acceptFriend(userId: userId)
            await load()
        } catch {}
    }

    func removeFriend(userId: Int) async {
        do {
            try await APIClient.shared.removeFriend(userId: userId)
            await load()
        } catch {}
    }
}

struct FriendsView: View {
    @Environment(AuthViewModel.self) var auth
    @State private var vm = FriendsViewModel()
    @State private var showLogin = false
    @State private var selectedTab = 0 // 0 = aujourd'hui, 1 = classement

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            if !auth.isLoggedIn {
                GuestFriendsView(showLogin: $showLogin)
            } else if vm.isLoading && vm.payload == nil {
                ProgressView().tint(Theme.gold)
            } else if let payload = vm.payload {
                ScrollView {
                    VStack(spacing: Theme.spacing20) {
                        if let code = payload.myCode {
                            YourCodeCard(code: code)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        AddFriendSection(vm: vm)
                            .padding(.horizontal, Theme.spacing16)

                        if !payload.pending.isEmpty {
                            PendingSection(pending: payload.pending, vm: vm)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        // Tab switcher
                        Picker("", selection: $selectedTab) {
                            Text("Aujourd'hui").tag(0)
                            Text("Classement").tag(1)
                        }
                        .pickerStyle(.segmented)
                        .padding(.horizontal, Theme.spacing16)

                        if selectedTab == 0 {
                            let friends = payload.friends.filter { !$0.isMe }
                            if !friends.isEmpty {
                                LeaderboardSection(friends: friends, vm: vm)
                                    .padding(.horizontal, Theme.spacing16)
                            } else if payload.pending.isEmpty {
                                EmptyFriendsView()
                            }
                        } else {
                            GlobalLeaderboardView()
                                .padding(.horizontal, Theme.spacing16)
                        }

                        Spacer(minLength: Theme.spacing24)
                    }
                    .padding(.top, Theme.spacing16)
                }
            } else if let error = vm.error {
                VStack(spacing: Theme.spacing12) {
                    Text(error).font(.system(size: 14)).foregroundColor(Theme.textDim)
                    Button("Réessayer") { Task { await vm.load() } }
                        .buttonStyle(PrimaryButtonStyle())
                        .frame(width: 140)
                }
            }
        }
        .navigationTitle("Amis")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .task {
            guard auth.isLoggedIn else { return }
            await vm.load()
        }
        .refreshable {
            guard auth.isLoggedIn else { return }
            await vm.load()
        }
        .sheet(isPresented: $showLogin) {
            LoginView().environment(auth)
        }
        .onChange(of: auth.isLoggedIn) { _, loggedIn in
            if loggedIn { Task { await vm.load() } }
        }
    }
}

// MARK: - Guest state

private struct GuestFriendsView: View {
    @Binding var showLogin: Bool

    var body: some View {
        VStack(spacing: Theme.spacing24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Theme.gold.opacity(0.1))
                    .frame(width: 100, height: 100)
                Image(systemName: "person.2.fill")
                    .font(.system(size: 40))
                    .foregroundColor(Theme.gold)
            }

            VStack(spacing: Theme.spacing12) {
                Text("Défiez vos amis")
                    .font(.custom("Georgia", size: 24))
                    .fontWeight(.bold)
                    .foregroundColor(Theme.text)

                Text("Créez un compte pour obtenir un code ami, voir les résultats de vos proches et comparer vos scores chaque jour.")
                    .font(.system(size: 15))
                    .foregroundColor(Theme.textDim)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
                    .padding(.horizontal, Theme.spacing24)
            }

            VStack(spacing: Theme.spacing8) {
                HStack(spacing: Theme.spacing16) {
                    FeaturePill(icon: "trophy.fill", label: "Classement", color: Theme.gold)
                    FeaturePill(icon: "flame.fill", label: "Streaks", color: Theme.amber)
                    FeaturePill(icon: "bell.fill", label: "Défis", color: Theme.green)
                }

                Button("Se connecter / Créer un compte") {
                    showLogin = true
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, Theme.spacing24)
                .padding(.top, Theme.spacing8)
            }

            Spacer()
        }
    }
}

private struct FeaturePill: View {
    let icon: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Theme.textDim)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.spacing12)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
    }
}

// MARK: - Your code card

private struct YourCodeCard: View {
    let code: String
    @State private var copied = false

    private var shareText: String {
        "Rejoins-moi sur GuessToday 🎬\nMon code ami : \(code)\nTélécharge l'app : https://apps.apple.com/app/guesstoday/id6745916981"
    }

    var body: some View {
        VStack(spacing: Theme.spacing8) {
            Text("Mon code ami")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            Text(code)
                .font(.system(size: 26, weight: .bold, design: .monospaced))
                .foregroundColor(Theme.gold)
                .tracking(4)

            HStack(spacing: Theme.spacing12) {
                Button {
                    UIPasteboard.general.string = code
                    withAnimation { copied = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                        withAnimation { copied = false }
                    }
                } label: {
                    Label(copied ? "Copié !" : "Copier", systemImage: copied ? "checkmark" : "doc.on.doc")
                        .font(.system(size: 13))
                        .foregroundColor(copied ? Theme.green : Theme.textDim)
                }

                Divider()
                    .frame(height: 16)
                    .background(Theme.border)

                ShareLink(item: shareText) {
                    Label("Inviter", systemImage: "square.and.arrow.up")
                        .font(.system(size: 13))
                        .foregroundColor(Theme.gold)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(Theme.spacing16)
        .cardStyle()
    }
}

// MARK: - Add friend

private struct AddFriendSection: View {
    @Bindable var vm: FriendsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Text("Ajouter un ami")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            HStack(spacing: Theme.spacing8) {
                TextField("Code ami", text: $vm.addCode)
                    .textFieldStyle(.plain)
                    .font(.system(size: 15, design: .monospaced))
                    .foregroundColor(Theme.text)
                    .tint(Theme.gold)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .padding(Theme.spacing12)
                    .background(Theme.surface)
                    .cornerRadius(Theme.radiusM)
                    .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))

                Button("Ajouter") {
                    Task { await vm.addFriend() }
                }
                .buttonStyle(PrimaryButtonStyle(isLoading: vm.isAdding))
                .frame(width: 90)
                .disabled(vm.addCode.isEmpty || vm.isAdding)
            }

            if let error = vm.addError {
                Text(error).font(.system(size: 12)).foregroundColor(Theme.red)
            }
            if vm.addSuccess {
                Text("Demande envoyée !").font(.system(size: 12)).foregroundColor(Theme.green)
            }
        }
    }
}

// MARK: - Pending requests

private struct PendingSection: View {
    let pending: [PendingFriendEntry]
    let vm: FriendsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Text("Demandes en attente")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            ForEach(pending) { entry in
                HStack(spacing: Theme.spacing12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(entry.displayName)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.text)
                        Text(entry.isIncoming ? "Souhaite vous ajouter" : "Demande envoyée")
                            .font(.system(size: 12))
                            .foregroundColor(Theme.textDim)
                    }

                    Spacer()

                    if entry.isIncoming {
                        Button("Accepter") {
                            Task { await vm.acceptFriend(userId: entry.id) }
                        }
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(Theme.background)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Theme.gold)
                        .cornerRadius(Theme.radiusS)
                    }
                }
                .padding(Theme.spacing12)
                .cardStyle()
            }
        }
    }
}

// MARK: - Leaderboard

private struct LeaderboardSection: View {
    let friends: [FriendScoreEntry]
    let vm: FriendsViewModel

    private let modes: [(String, String)] = [("film", "🎬"), ("series", "📺"), ("wiki", "🧠")]

    private var sortedFriends: [FriendScoreEntry] {
        friends.sorted { a, b in
            let winsA = ["film", "series", "wiki"].compactMap { a.scores.score(for: $0) }.filter(\.won).count
            let winsB = ["film", "series", "wiki"].compactMap { b.scores.score(for: $0) }.filter(\.won).count
            if winsA != winsB { return winsA > winsB }
            let attA = ["film", "series", "wiki"].compactMap { a.scores.score(for: $0) }.map(\.attemptsUsed).reduce(0, +)
            let attB = ["film", "series", "wiki"].compactMap { b.scores.score(for: $0) }.map(\.attemptsUsed).reduce(0, +)
            return attA < attB
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Text("Amis — aujourd'hui")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            // Header row
            HStack(spacing: 0) {
                Text("Joueur")
                    .font(.system(size: 11))
                    .foregroundColor(Theme.muted)
                    .frame(maxWidth: .infinity, alignment: .leading)
                ForEach(modes, id: \.0) { mode in
                    Text(mode.1)
                        .font(.system(size: 14))
                        .frame(width: 44, alignment: .center)
                }
                Text("🔥")
                    .font(.system(size: 14))
                    .frame(width: 36, alignment: .center)
            }
            .padding(.horizontal, Theme.spacing12)
            .padding(.bottom, 4)

            ForEach(sortedFriends) { friend in
                FriendLeaderboardRow(friend: friend, modes: modes)
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            Task { await vm.removeFriend(userId: friend.id) }
                        } label: {
                            Label("Retirer", systemImage: "person.badge.minus")
                        }
                    }
            }
        }
    }
}

private struct FriendLeaderboardRow: View {
    let friend: FriendScoreEntry
    let modes: [(String, String)]

    var body: some View {
        HStack(spacing: 0) {
            Text(friend.displayName)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Theme.text)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            ForEach(modes, id: \.0) { mode in
                scoreBadge(friend.scores.score(for: mode.0))
                    .frame(width: 44, alignment: .center)
            }

            Text("\(friend.streak)")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(friend.streak > 0 ? Theme.gold : Theme.muted)
                .frame(width: 36, alignment: .center)
        }
        .padding(Theme.spacing12)
        .cardStyle()
    }

    @ViewBuilder
    private func scoreBadge(_ entry: DayScoreEntry?) -> some View {
        if let entry {
            if entry.won {
                Text("\(entry.attemptsUsed)")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Theme.green)
            } else {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Theme.red)
            }
        } else {
            Text("–")
                .font(.system(size: 13))
                .foregroundColor(Theme.muted)
        }
    }
}

// MARK: - Global Leaderboard

private struct GlobalLeaderboardView: View {
    @Environment(AuthViewModel.self) var auth
    @State private var entries: [LeaderboardEntry] = []
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: Theme.spacing12) {
            if isLoading && entries.isEmpty {
                ProgressView().tint(Theme.gold).padding(Theme.spacing24)
            } else if let error {
                Text(error).font(.system(size: 13)).foregroundColor(Theme.red).multilineTextAlignment(.center)
            } else if entries.isEmpty {
                Text("Aucune donnée pour le classement")
                    .font(.system(size: 14)).foregroundColor(Theme.textDim)
                    .padding(Theme.spacing24)
            } else {
                if entries.count >= 3 {
                    LeaderboardPodium(entries: Array(entries.prefix(3)), myId: auth.user?.id)
                }
                LeaderboardTable(entries: entries, myId: auth.user?.id)
            }
        }
        .task { await load() }
    }

    private func load() async {
        isLoading = true
        error = nil
        do {
            let payload = try await APIClient.shared.friendsLeaderboard()
            entries = payload.leaderboard
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}

private struct LeaderboardPodium: View {
    let entries: [LeaderboardEntry]
    let myId: Int?

    private var ordered: [LeaderboardEntry?] {
        // Display order: 2nd (silver left), 1st (gold center), 3rd (bronze right)
        guard entries.count >= 3 else { return entries.map { Optional($0) } }
        return [entries[1], entries[0], entries[2]]
    }

    private let heights: [CGFloat] = [70, 90, 55]
    private let medals = ["🥈", "🥇", "🥉"]
    private let barColors: [Color] = [Color.gray.opacity(0.5), Color(red: 0.83, green: 0.66, blue: 0.26), Color(red: 0.8, green: 0.5, blue: 0.2).opacity(0.7)]

    var body: some View {
        HStack(alignment: .bottom, spacing: Theme.spacing8) {
            ForEach(Array(ordered.enumerated()), id: \.offset) { idx, entry in
                if let entry {
                    VStack(spacing: 6) {
                        Text(medals[idx])
                            .font(.system(size: 20))

                        ZStack {
                            Circle()
                                .fill(entry.id == myId ? Theme.gold.opacity(0.15) : Theme.surface)
                                .frame(width: 46, height: 46)
                                .overlay(Circle().stroke(entry.id == myId ? Theme.gold : Theme.border, lineWidth: entry.id == myId ? 2 : 1))
                            if let url = entry.avatarUrl, let resolved = resolveURL(url) {
                                AsyncImage(url: resolved) { img in
                                    img.resizable().scaledToFill()
                                } placeholder: {
                                    Text(String(entry.displayName.prefix(1)).uppercased())
                                        .font(.system(size: 16, weight: .bold))
                                        .foregroundColor(Theme.gold)
                                }
                                .frame(width: 44, height: 44)
                                .clipShape(Circle())
                            } else {
                                Text(String(entry.displayName.prefix(1)).uppercased())
                                    .font(.system(size: 16, weight: .bold))
                                    .foregroundColor(Theme.gold)
                            }
                        }

                        Text(entry.displayName)
                            .font(.system(size: 11, weight: entry.id == myId ? .bold : .medium))
                            .foregroundColor(entry.id == myId ? Theme.gold : Theme.text)
                            .lineLimit(1)
                            .frame(maxWidth: 80)

                        Text("\(entry.totalWins) victoires")
                            .font(.system(size: 10))
                            .foregroundColor(Theme.textDim)

                        UnevenRoundedRectangle(topLeadingRadius: 4, topTrailingRadius: 4)
                            .fill(barColors[idx])
                            .frame(height: heights[idx])
                            .frame(maxWidth: .infinity)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, Theme.spacing8)
    }

    private func resolveURL(_ url: String) -> URL? {
        if url.hasPrefix("http://") || url.hasPrefix("https://") { return URL(string: url) }
        return URL(string: APIClient.baseURL + url)
    }
}

private struct LeaderboardTable: View {
    let entries: [LeaderboardEntry]
    let myId: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Text("Classement général")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            // Header
            HStack(spacing: 0) {
                Text("#").font(.system(size: 11)).foregroundColor(Theme.muted).frame(width: 28, alignment: .center)
                Text("Joueur").font(.system(size: 11)).foregroundColor(Theme.muted).frame(maxWidth: .infinity, alignment: .leading)
                Text("🎬").font(.system(size: 13)).frame(width: 36, alignment: .center)
                Text("📺").font(.system(size: 13)).frame(width: 36, alignment: .center)
                Text("🧠").font(.system(size: 13)).frame(width: 36, alignment: .center)
                Text("🔥").font(.system(size: 13)).frame(width: 36, alignment: .center)
            }
            .padding(.horizontal, Theme.spacing12)
            .padding(.bottom, 2)

            ForEach(entries) { entry in
                LeaderboardTableRow(entry: entry, isMe: entry.id == myId)
            }
        }
    }
}

private struct LeaderboardTableRow: View {
    let entry: LeaderboardEntry
    let isMe: Bool

    private var rankLabel: String {
        switch entry.rank {
        case 1: return "🥇"
        case 2: return "🥈"
        case 3: return "🥉"
        default: return "\(entry.rank)"
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            Group {
                if entry.rank <= 3 {
                    Text(rankLabel).font(.system(size: 14))
                } else {
                    Text("\(entry.rank)")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.muted)
                }
            }
            .frame(width: 28, alignment: .center)

            Text(entry.displayName)
                .font(.system(size: 13, weight: isMe ? .bold : .medium))
                .foregroundColor(isMe ? Theme.gold : Theme.text)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            Text("\(entry.filmWins)")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(entry.filmWins > 0 ? Theme.green : Theme.muted)
                .frame(width: 36, alignment: .center)

            Text("\(entry.seriesWins)")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(entry.seriesWins > 0 ? Theme.green : Theme.muted)
                .frame(width: 36, alignment: .center)

            Text("\(entry.wikiWins)")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(entry.wikiWins > 0 ? Theme.green : Theme.muted)
                .frame(width: 36, alignment: .center)

            Text("\(entry.currentStreak)")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(entry.currentStreak > 0 ? Theme.gold : Theme.muted)
                .frame(width: 36, alignment: .center)
        }
        .padding(Theme.spacing12)
        .background(isMe ? Theme.gold.opacity(0.07) : Color.clear)
        .cardStyle()
        .overlay(isMe ? RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.gold.opacity(0.3), lineWidth: 1) : nil)
    }
}

// MARK: - Preview helpers

private let mockLeaderboard: [LeaderboardEntry] = [
    LeaderboardEntry(id: 1, displayName: "Louis B.", avatarUrl: nil, isMe: true,  rank: 1, totalWins: 42, totalPlayed: 50, winRate: 0.84, filmWins: 18, seriesWins: 14, wikiWins: 10, currentStreak: 7,  maxStreak: 12),
    LeaderboardEntry(id: 2, displayName: "Camille",  avatarUrl: nil, isMe: false, rank: 2, totalWins: 38, totalPlayed: 48, winRate: 0.79, filmWins: 15, seriesWins: 12, wikiWins: 11, currentStreak: 3,  maxStreak: 9),
    LeaderboardEntry(id: 3, displayName: "Thomas R.", avatarUrl: nil, isMe: false, rank: 3, totalWins: 31, totalPlayed: 45, winRate: 0.69, filmWins: 12, seriesWins: 10, wikiWins: 9,  currentStreak: 5,  maxStreak: 8),
    LeaderboardEntry(id: 4, displayName: "Sophie M.", avatarUrl: nil, isMe: false, rank: 4, totalWins: 27, totalPlayed: 42, winRate: 0.64, filmWins: 10, seriesWins: 9,  wikiWins: 8,  currentStreak: 2,  maxStreak: 6),
    LeaderboardEntry(id: 5, displayName: "Adrien",   avatarUrl: nil, isMe: false, rank: 5, totalWins: 22, totalPlayed: 40, winRate: 0.55, filmWins: 9,  seriesWins: 7,  wikiWins: 6,  currentStreak: 0,  maxStreak: 5),
    LeaderboardEntry(id: 6, displayName: "Julie P.", avatarUrl: nil, isMe: false, rank: 6, totalWins: 19, totalPlayed: 38, winRate: 0.50, filmWins: 8,  seriesWins: 6,  wikiWins: 5,  currentStreak: 1,  maxStreak: 4),
    LeaderboardEntry(id: 7, displayName: "Marc D.",  avatarUrl: nil, isMe: false, rank: 7, totalWins: 14, totalPlayed: 35, winRate: 0.40, filmWins: 6,  seriesWins: 5,  wikiWins: 3,  currentStreak: 0,  maxStreak: 3),
    LeaderboardEntry(id: 8, displayName: "Léa K.",   avatarUrl: nil, isMe: false, rank: 8, totalWins: 10, totalPlayed: 30, winRate: 0.33, filmWins: 4,  seriesWins: 4,  wikiWins: 2,  currentStreak: 0,  maxStreak: 2),
]

#Preview("Global Leaderboard") {
    NavigationStack {
        ScrollView {
            VStack(spacing: Theme.spacing12) {
                LeaderboardPodium(entries: Array(mockLeaderboard.prefix(3)), myId: 1)
                    .padding(.horizontal, Theme.spacing16)
                LeaderboardTable(entries: mockLeaderboard, myId: 1)
                    .padding(.horizontal, Theme.spacing16)
            }
            .padding(.top, Theme.spacing16)
        }
        .background(Theme.background)
        .navigationTitle("Classement")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
}

// MARK: - Empty state

private struct EmptyFriendsView: View {
    var body: some View {
        VStack(spacing: Theme.spacing12) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 40))
                .foregroundColor(Theme.muted)
            Text("Vous n'avez pas encore d'amis")
                .font(.system(size: 14))
                .foregroundColor(Theme.textDim)
            Text("Partagez votre code avec vos amis pour voir leurs résultats quotidiens.")
                .font(.system(size: 13))
                .foregroundColor(Theme.muted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Theme.spacing24)
        }
        .padding(Theme.spacing24)
    }
}
