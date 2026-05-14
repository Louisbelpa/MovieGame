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
    @State private var vm = FriendsViewModel()

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            if vm.isLoading && vm.payload == nil {
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

                        let friends = payload.friends.filter { !$0.isMe }
                        if !friends.isEmpty {
                            LeaderboardSection(friends: friends, vm: vm)
                                .padding(.horizontal, Theme.spacing16)
                        } else if payload.pending.isEmpty {
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
        .task { await vm.load() }
        .refreshable { await vm.load() }
    }
}

// MARK: - Your code card

private struct YourCodeCard: View {
    let code: String
    @State private var copied = false

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

            ForEach(friends) { friend in
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
