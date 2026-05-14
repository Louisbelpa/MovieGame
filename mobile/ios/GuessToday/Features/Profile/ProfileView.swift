import SwiftUI

struct ProfileView: View {
    @Environment(AuthViewModel.self) var auth
    @State private var showLogin = false
    @State private var showChangePassword = false
    @State private var selectedMode: GameMode = .film

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                if !auth.isLoggedIn {
                    GuestProfileView(showLogin: $showLogin)
                } else {
                    LoggedInProfileView(
                        user: auth.user!,
                        selectedMode: $selectedMode,
                        showChangePassword: $showChangePassword
                    )
                }
            }
            .navigationTitle("Profil")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                if auth.isLoggedIn {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            Task { await auth.logout() }
                        } label: {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                                .foregroundColor(Theme.textDim)
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showLogin) {
            LoginView().environment(auth)
        }
        .sheet(isPresented: $showChangePassword) {
            ChangePasswordView()
        }
    }
}

// MARK: - Guest view

private struct GuestProfileView: View {
    @Binding var showLogin: Bool

    var body: some View {
        VStack(spacing: Theme.spacing20) {
            Spacer()
            Image(systemName: "person.circle.fill")
                .font(.system(size: 64))
                .foregroundColor(Theme.muted)
            VStack(spacing: Theme.spacing8) {
                Text("Pas encore connecté")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(Theme.text)
                Text("Créez un compte pour sauvegarder vos stats et défier vos amis.")
                    .font(.system(size: 14))
                    .foregroundColor(Theme.textDim)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.spacing24)
            }
            Button("Se connecter / Créer un compte") {
                showLogin = true
            }
            .buttonStyle(PrimaryButtonStyle())
            .padding(.horizontal, Theme.spacing24)
            Spacer()
        }
    }
}

// MARK: - Logged-in view

private struct LoggedInProfileView: View {
    let user: User
    @Binding var selectedMode: GameMode
    @Binding var showChangePassword: Bool

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.spacing20) {
                // Avatar + name
                VStack(spacing: Theme.spacing12) {
                    AvatarView(url: user.avatarUrl, size: 72)

                    VStack(spacing: 4) {
                        Text(user.displayName)
                            .font(.custom("Georgia", size: 22))
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.text)

                        if let email = user.email {
                            Text(email)
                                .font(.system(size: 13))
                                .foregroundColor(Theme.textDim)
                        }

                        if user.emailVerified == false {
                            Label("Email non vérifié", systemImage: "exclamationmark.circle")
                                .font(.system(size: 12))
                                .foregroundColor(Theme.amber)
                        }
                    }
                }
                .padding(.top, Theme.spacing16)

                // Mode tabs
                HStack(spacing: 0) {
                    ForEach([GameMode.film, .wiki], id: \.title) { mode in
                        Button(mode.title) { selectedMode = mode }
                            .font(.system(size: 14, weight: selectedMode == mode ? .semibold : .regular))
                            .foregroundColor(selectedMode == mode ? Theme.gold : Theme.textDim)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 10)
                            .background(selectedMode == mode ? Theme.gold.opacity(0.1) : Color.clear)
                            .overlay(alignment: .bottom) {
                                if selectedMode == mode {
                                    Rectangle()
                                        .fill(Theme.gold)
                                        .frame(height: 2)
                                }
                            }
                    }
                }
                .background(Theme.surface)
                .cornerRadius(Theme.radiusM)
                .padding(.horizontal, Theme.spacing16)

                // Stats for selected mode
                StatsPanel(mode: selectedMode)
                    .padding(.horizontal, Theme.spacing16)

                // Actions
                VStack(spacing: Theme.spacing8) {
                    Button {
                        showChangePassword = true
                    } label: {
                        Label("Changer le mot de passe", systemImage: "lock")
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(SecondaryButtonStyle())
                }
                .padding(.horizontal, Theme.spacing16)

                Spacer(minLength: Theme.spacing24)
            }
        }
    }
}

// MARK: - Stats panel

private struct StatsPanel: View {
    let mode: GameMode
    private var stats: LocalStats {
        guard let data = UserDefaults.standard.data(forKey: "stats_\(mode.statsKey)"),
              let s = try? JSONDecoder().decode(LocalStats.self, from: data) else { return LocalStats() }
        return s
    }

    var body: some View {
        VStack(spacing: Theme.spacing16) {
            // Summary row
            HStack {
                StatBox(label: "Joués", value: "\(stats.gamesPlayed)")
                Divider().frame(height: 36).background(Theme.border)
                StatBox(label: "Victoires", value: "\(stats.wins)")
                Divider().frame(height: 36).background(Theme.border)
                StatBox(label: "Série actuelle", value: "\(stats.currentStreak)")
                Divider().frame(height: 36).background(Theme.border)
                StatBox(label: "Meilleure série", value: "\(stats.maxStreak)")
            }
            .padding(Theme.spacing12)
            .cardStyle()

            // Win rate
            if stats.gamesPlayed > 0 {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Taux de victoire")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.textDim)
                        Spacer()
                        Text("\(Int(stats.winRate * 100))%")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Theme.gold)
                    }
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Theme.surfaceAlt).frame(height: 6)
                            Capsule()
                                .fill(Theme.gold)
                                .frame(width: geo.size.width * stats.winRate, height: 6)
                        }
                    }
                    .frame(height: 6)
                }
                .padding(Theme.spacing12)
                .cardStyle()
            }

            // Distribution
            if !stats.distribution.isEmpty {
                DistributionChart(distribution: stats.distribution)
            }
        }
    }
}

private struct DistributionChart: View {
    let distribution: [String: Int]

    private var maxCount: Int { distribution.values.max() ?? 1 }
    private var sortedKeys: [String] { distribution.keys.sorted() }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            Text("Distribution des tentatives")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.textDim)

            ForEach(sortedKeys, id: \.self) { key in
                let count = distribution[key] ?? 0
                HStack(spacing: 8) {
                    Text(key)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Theme.textDim)
                        .frame(width: 16)

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Theme.surfaceAlt)
                            Capsule()
                                .fill(Theme.gold)
                                .frame(width: max(4, geo.size.width * (Double(count) / Double(maxCount))))
                        }
                        .frame(height: 18)
                    }
                    .frame(height: 18)

                    Text("\(count)")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textDim)
                        .frame(width: 24)
                }
            }
        }
        .padding(Theme.spacing12)
        .cardStyle()
    }
}

// MARK: - Avatar

struct AvatarView: View {
    let url: String?
    let size: CGFloat

    var body: some View {
        Group {
            if let url, let imageURL = URL(string: url) {
                AsyncImage(url: imageURL) { img in
                    img.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle().fill(Theme.surfaceAlt)
                }
            } else {
                Circle()
                    .fill(Theme.surfaceAlt)
                    .overlay(
                        Image(systemName: "person.fill")
                            .font(.system(size: size * 0.4))
                            .foregroundColor(Theme.muted)
                    )
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(Theme.border, lineWidth: 1))
    }
}

// MARK: - Change password sheet

struct ChangePasswordView: View {
    @Environment(AuthViewModel.self) var auth
    @Environment(\.dismiss) private var dismiss
    @State private var current = ""
    @State private var new = ""
    @State private var confirm = ""
    @State private var isLoading = false
    @State private var error: String?
    @State private var success = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                VStack(spacing: Theme.spacing16) {
                    if success {
                        VStack(spacing: 12) {
                            Image(systemName: "checkmark.circle.fill").font(.system(size: 48)).foregroundColor(Theme.green)
                            Text("Mot de passe modifié").font(.system(size: 18, weight: .semibold)).foregroundColor(Theme.text)
                            Button("Fermer") { dismiss() }.buttonStyle(PrimaryButtonStyle()).padding(.horizontal, Theme.spacing16)
                        }
                        .padding()
                    } else {
                        VStack(spacing: Theme.spacing12) {
                            AuthTextField(placeholder: "Mot de passe actuel", text: $current, contentType: .password, isSecure: true)
                            AuthTextField(placeholder: "Nouveau mot de passe", text: $new, contentType: .newPassword, isSecure: true)
                            AuthTextField(placeholder: "Confirmer le nouveau", text: $confirm, contentType: .newPassword, isSecure: true)
                        }
                        .padding(.horizontal, Theme.spacing16)
                        .padding(.top, Theme.spacing24)

                        if let error { Text(error).font(.system(size: 13)).foregroundColor(Theme.red) }

                        Button("Modifier") { Task { await change() } }
                            .buttonStyle(PrimaryButtonStyle(isLoading: isLoading))
                            .disabled(isLoading || current.isEmpty || new.isEmpty || new != confirm)
                            .padding(.horizontal, Theme.spacing16)

                        Spacer()
                    }
                }
            }
            .navigationTitle("Mot de passe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }.foregroundColor(Theme.textDim)
                }
            }
        }
    }

    private func change() async {
        isLoading = true; error = nil
        defer { isLoading = false }
        do {
            try await auth.changePassword(current: current, new: new)
            success = true
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }
}
