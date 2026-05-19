import SwiftUI
import UIKit

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

    private let successHaptic = UINotificationFeedbackGenerator()
    private let errorHaptic = UINotificationFeedbackGenerator()
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)

    func load() async {
        isLoading = true
        error = nil
        #if DEBUG || NRT
        if FeatureFlags.shared.useMockData {
            try? await Task.sleep(nanoseconds: 400_000_000) // simule latence réseau
            payload = MockData.friendsPayload
            isLoading = false
            return
        }
        #endif
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
        addSuccess = false
        do {
            try await APIClient.shared.addFriend(code: addCode.uppercased())
            addCode = ""
            addSuccess = true
            successHaptic.notificationOccurred(.success)
            await load()
        } catch let e as APIError {
            addError = e.localizedDescription
            errorHaptic.notificationOccurred(.error)
        } catch {
            addError = error.localizedDescription
            errorHaptic.notificationOccurred(.error)
        }
        isAdding = false
    }

    func acceptFriend(userId: Int) async {
        do {
            try await APIClient.shared.acceptFriend(userId: userId)
            successHaptic.notificationOccurred(.success)
            await load()
        } catch let e as APIError {
            addError = e.localizedDescription
            errorHaptic.notificationOccurred(.error)
        } catch {
            addError = error.localizedDescription
            errorHaptic.notificationOccurred(.error)
        }
    }

    func removeFriend(userId: Int) async {
        do {
            try await APIClient.shared.removeFriend(userId: userId)
            await load()
        } catch let e as APIError {
            addError = e.localizedDescription
        } catch {
            addError = error.localizedDescription
        }
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
                let hasFriends = payload.friends.filter { !$0.isMe }.count > 0 || !payload.pending.isEmpty
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

                        if hasFriends {
                            // Tab switcher only when there are friends
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
                                }
                            } else {
                                GlobalLeaderboardView()
                                    .padding(.horizontal, Theme.spacing16)
                            }
                        } else {
                            EmptyFriendsView()
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
        ScrollView {
            VStack(spacing: 0) {
                // Hero section with contained glow
                VStack(spacing: Theme.spacing20) {
                    GuestAvatarCluster()
                        .padding(.top, Theme.spacing28)

                    VStack(spacing: Theme.spacing8) {
                        Text("Joue avec tes amis")
                            .font(Theme.fraunces(size: 26))
                            .foregroundColor(Theme.text)
                            .multilineTextAlignment(.center)

                        Text("Compare vos scores, suivez vos streaks\net voyez qui devine le plus vite.")
                            .font(Theme.inter(size: 14))
                            .foregroundColor(Theme.textDim)
                            .multilineTextAlignment(.center)
                            .lineSpacing(4)
                    }
                    .padding(.bottom, Theme.spacing8)
                }
                .frame(maxWidth: .infinity)
                .background(
                    RadialGradient(
                        gradient: Gradient(colors: [Theme.gold.opacity(0.09), .clear]),
                        center: .init(x: 0.5, y: 0.1),
                        startRadius: 0,
                        endRadius: 220
                    )
                )

                // Feature rows
                VStack(spacing: 0) {
                    GuestFeatureRow(
                        icon: "number.square.fill",
                        color: Theme.gold,
                        title: "Code ami unique",
                        subtitle: "Partage ton code pour inviter tes proches en un instant."
                    )
                    Divider().background(Theme.border).padding(.leading, 52)
                    GuestFeatureRow(
                        icon: "chart.bar.fill",
                        color: Theme.modeSeries,
                        title: "Scores du jour",
                        subtitle: "Vois en temps réel si tes amis ont trouvé le film ou la personnalité."
                    )
                    Divider().background(Theme.border).padding(.leading, 52)
                    GuestFeatureRow(
                        icon: "flame.fill",
                        color: Theme.amber,
                        title: "Classement global",
                        subtitle: "Victoires, streaks, taux de réussite — tout est là."
                    )
                }
                .padding(.horizontal, Theme.spacing16)
                .padding(.top, Theme.spacing24)

                // CTAs
                VStack(spacing: Theme.spacing12) {
                    Button("Créer un compte") { showLogin = true }
                        .buttonStyle(PrimaryButtonStyle())

                    Button("J'ai déjà un compte") { showLogin = true }
                        .font(Theme.inter(size: 14))
                        .foregroundColor(Theme.textDim)
                }
                .padding(.horizontal, Theme.spacing16)
                .padding(.top, Theme.spacing28)
                .padding(.bottom, Theme.spacing24)
            }
        }
    }
}

private struct GuestAvatarCluster: View {
    private let avatars: [(color: Color, initial: String)] = [
        (Theme.modeSeries, "L"),
        (Theme.modeWiki,   "M"),
        (Theme.green,      "T"),
    ]

    var body: some View {
        ZStack {
            // Subtle background disc
            Circle()
                .fill(Theme.surface)
                .frame(width: 100, height: 100)
                .overlay(Circle().stroke(Theme.border, lineWidth: 1))

            // Avatar at left
            avatarCircle(avatars[0], size: 46)
                .offset(x: -30, y: 0)
                .zIndex(1)

            // Avatar at right
            avatarCircle(avatars[2], size: 46)
                .offset(x: 30, y: 0)
                .zIndex(1)

            // Avatar on top-center (slightly larger, in front)
            avatarCircle(avatars[1], size: 50)
                .offset(x: 0, y: -4)
                .zIndex(2)
        }
        .frame(width: 120, height: 90)
    }

    @ViewBuilder
    private func avatarCircle(_ avatar: (color: Color, initial: String), size: CGFloat) -> some View {
        Circle()
            .fill(avatar.color.opacity(0.16))
            .frame(width: size, height: size)
            .overlay(
                Text(avatar.initial)
                    .font(Theme.inter(size: size * 0.36, weight: .bold))
                    .foregroundColor(avatar.color)
            )
            .overlay(Circle().stroke(avatar.color.opacity(0.40), lineWidth: 1.5))
            .overlay(Circle().stroke(Theme.background, lineWidth: 2))
    }
}

private struct GuestFeatureRow: View {
    let icon: String
    let color: Color
    let title: String
    let subtitle: String

    var body: some View {
        HStack(alignment: .top, spacing: Theme.spacing16) {
            ZStack {
                RoundedRectangle(cornerRadius: Theme.radiusS)
                    .fill(color.opacity(0.12))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundColor(color)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(Theme.inter(size: 14, weight: .semibold))
                    .foregroundColor(Theme.text)
                Text(subtitle)
                    .font(Theme.inter(size: 13))
                    .foregroundColor(Theme.textDim)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer()
        }
        .padding(.vertical, Theme.spacing14)
    }
}

// MARK: - Your code card

// MARK: - Your Code Card (tappable → FriendCodeSheet)

private struct YourCodeCard: View {
    let code: String
    @State private var showSheet = false

    var body: some View {
        Button { showSheet = true } label: {
            HStack(spacing: Theme.spacing12) {
                // QR thumbnail
                QRCodeImage(content: code, size: 48)
                    .cornerRadius(6)

                VStack(alignment: .leading, spacing: 3) {
                    Text("Mon code ami")
                        .font(Theme.inter(size: 11, weight: .semibold))
                        .foregroundColor(Theme.textDim)
                        .textCase(.uppercase)
                        .tracking(0.8)
                    Text(code)
                        .font(.system(size: 20, weight: .bold, design: .monospaced))
                        .foregroundColor(Theme.gold)
                        .tracking(3)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Theme.muted)
            }
            .padding(Theme.spacing16)
            .cardStyle()
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showSheet) {
            FriendCodeSheet(code: code)
        }
    }
}

// MARK: - Friend Code Sheet (QR + partage)

private struct FriendCodeSheet: View {
    let code: String
    @Environment(\.dismiss) private var dismiss
    @State private var showInfo = false
    @State private var copied = false

    private var shareText: String {
        "Rejoins-moi sur GuessToday 🎬\nMon code ami : \(code)\nhttps://apps.apple.com/app/guesstoday/id6745916981"
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Card blanche QR
                    VStack(spacing: Theme.spacing16) {
                        // Header card : nom app + ⓘ
                        HStack {
                            HStack(spacing: 8) {
                                ApertureIconView(size: 22)
                                Text("GuessToday")
                                    .font(Theme.inter(size: 15, weight: .semibold))
                                    .foregroundColor(Theme.text)
                            }
                            Spacer()
                            Button {
                                showInfo = true
                            } label: {
                                Image(systemName: "info.circle")
                                    .font(.system(size: 20))
                                    .foregroundColor(Theme.textDim)
                            }
                        }

                        Divider().background(Theme.border)

                        // Code + QR
                        VStack(spacing: Theme.spacing12) {
                            Text("Code ami")
                                .font(Theme.inter(size: 12))
                                .foregroundColor(Theme.textDim)

                            Text(code)
                                .font(.system(size: 28, weight: .bold, design: .monospaced))
                                .foregroundColor(Theme.text)
                                .tracking(4)

                            QRCodeImage(content: code, size: 200)
                                .cornerRadius(12)
                                .padding(.top, Theme.spacing8)
                        }
                    }
                    .padding(Theme.spacing20)
                    .background(Theme.surface)
                    .cornerRadius(Theme.radiusL)
                    .overlay(RoundedRectangle(cornerRadius: Theme.radiusL).stroke(Theme.border, lineWidth: 1))
                    .padding(.horizontal, Theme.spacing20)
                    .padding(.top, Theme.spacing8)

                    Spacer()

                    // Actions
                    VStack(spacing: Theme.spacing8) {
                        ShareLink(item: shareText) {
                            Label("Partager mon code", systemImage: "square.and.arrow.up")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(PrimaryButtonStyle())

                        Button {
                            UIPasteboard.general.string = code
                            UINotificationFeedbackGenerator().notificationOccurred(.success)
                            withAnimation { copied = true }
                            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { withAnimation { copied = false } }
                        } label: {
                            Label(copied ? "Copié !" : "Copier le code", systemImage: copied ? "checkmark" : "doc.on.doc")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(SecondaryButtonStyle())
                    }
                    .padding(.horizontal, Theme.spacing20)
                    .padding(.bottom, Theme.spacing24)
                }
            }
            .navigationTitle("Mon code ami")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill").foregroundColor(Theme.muted)
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
        .sheet(isPresented: $showInfo) {
            FriendCodeInfoSheet()
        }
    }
}

// MARK: - Info sheet "Qu'est-ce qu'un code ami ?"

private struct FriendCodeInfoSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: Theme.spacing24) {
                        // Illustration
                        HStack {
                            Spacer()
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 72))
                                .foregroundColor(Theme.gold.opacity(0.25))
                                .padding(.vertical, Theme.spacing16)
                            Spacer()
                        }

                        VStack(alignment: .leading, spacing: Theme.spacing12) {
                            Text("Ton **code ami** est un identifiant unique qui te permet d'inviter tes proches sur GuessToday sans partager ton email ou ton numéro de téléphone.")
                                .font(Theme.inter(size: 15))
                                .foregroundColor(Theme.text)
                                .lineSpacing(4)

                            Text("Tu peux retrouver ton code et inviter des amis depuis l'onglet Amis à tout moment.")
                                .font(Theme.inter(size: 15))
                                .foregroundColor(Theme.text)
                                .lineSpacing(4)
                        }

                        VStack(alignment: .leading, spacing: Theme.spacing16) {
                            Text("Comment ça marche")
                                .font(Theme.fraunces(size: 20))
                                .fontWeight(.bold)
                                .foregroundColor(Theme.text)

                            InfoRow(icon: "lock.shield.fill", color: Theme.green,
                                    title: "Privé et sécurisé",
                                    subtitle: "Seul ton code est nécessaire pour t'ajouter — aucune info personnelle partagée.")

                            InfoRow(icon: "gamecontroller.fill", color: Theme.gold,
                                    title: "Compare tes résultats",
                                    subtitle: "Vois les scores de tes amis chaque jour et compare vos streaks.")

                            InfoRow(icon: "trophy.fill", color: Theme.amber,
                                    title: "Classement global",
                                    subtitle: "Retrouve-toi dans le classement général parmi tous les joueurs.")
                        }
                    }
                    .padding(Theme.spacing20)
                }
            }
            .navigationTitle("Qu'est-ce qu'un code ami ?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill").foregroundColor(Theme.muted)
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
    }
}

private struct InfoRow: View {
    let icon: String
    let color: Color
    let title: String
    let subtitle: String

    var body: some View {
        HStack(alignment: .top, spacing: Theme.spacing12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(color)
                .frame(width: 32, height: 32)
                .background(color.opacity(0.12))
                .cornerRadius(8)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(Theme.inter(size: 14, weight: .semibold))
                    .foregroundColor(Theme.text)
                Text(subtitle)
                    .font(Theme.inter(size: 13))
                    .foregroundColor(Theme.textDim)
                    .lineSpacing(2)
            }
        }
    }
}

// MARK: - QR Code generator (CoreImage, pas de dépendance externe)

private struct QRCodeImage: View {
    let content: String
    let size: CGFloat

    private var qrImage: UIImage? {
        guard let data = content.data(using: .ascii),
              let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        guard let output = filter.outputImage else { return nil }
        let scale = size / output.extent.width * UIScreen.main.scale
        let scaled = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        let context = CIContext()
        guard let cgImage = context.createCGImage(scaled, from: scaled.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }

    var body: some View {
        if let img = qrImage {
            Image(uiImage: img)
                .interpolation(.none)
                .resizable()
                .frame(width: size, height: size)
        } else {
            Rectangle()
                .fill(Theme.surfaceAlt)
                .frame(width: size, height: size)
        }
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
        #if DEBUG || NRT
        if FeatureFlags.shared.useMockData {
            try? await Task.sleep(nanoseconds: 400_000_000)
            entries = MockData.leaderboardPayload.leaderboard
            isLoading = false
            return
        }
        #endif
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
