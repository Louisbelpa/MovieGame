import SwiftUI
import UserNotifications
import PhotosUI

struct ProfileView: View {
    @Environment(AuthViewModel.self) var auth
    @State private var showLogin = false
    @State private var showChangePassword = false
    @State private var showEditName = false
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
                        showChangePassword: $showChangePassword,
                        showEditName: $showEditName
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
        .sheet(isPresented: $showEditName) {
            EditNameView()
        }
    }
}

// MARK: - Settings screen

struct SettingsView: View {
    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: Theme.spacing20) {
                    NotificationSettingsSection()
                        .padding(.horizontal, Theme.spacing16)
                    Spacer(minLength: Theme.spacing24)
                }
                .padding(.top, Theme.spacing16)
            }
        }
        .navigationTitle("Réglages")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
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
    @Binding var showEditName: Bool

    @Environment(AuthViewModel.self) var auth
    @State private var avatarItem: PhotosPickerItem?
    @State private var avatarUploading = false

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.spacing20) {
                // Avatar + name
                VStack(spacing: Theme.spacing12) {
                    PhotosPicker(selection: $avatarItem, matching: .images) {
                        ZStack(alignment: .bottomTrailing) {
                            AvatarView(url: user.avatarUrl, size: 72)
                            ZStack {
                                Circle().fill(Theme.surface).frame(width: 24, height: 24)
                                if avatarUploading {
                                    ProgressView().scaleEffect(0.6).tint(Theme.gold)
                                } else {
                                    Image(systemName: "camera.fill")
                                        .font(.system(size: 11))
                                        .foregroundColor(Theme.gold)
                                }
                            }
                            .overlay(Circle().stroke(Theme.background, lineWidth: 2))
                        }
                    }
                    .onChange(of: avatarItem) { _, item in
                        guard let item else { return }
                        Task { await uploadAvatar(item) }
                    }

                    VStack(spacing: 4) {
                        HStack(spacing: 6) {
                            Text(user.displayName)
                                .font(.custom("Georgia", size: 22))
                                .fontWeight(.semibold)
                                .foregroundColor(Theme.text)
                            Button { showEditName = true } label: {
                                Image(systemName: "pencil.circle")
                                    .font(.system(size: 16))
                                    .foregroundColor(Theme.textDim)
                            }
                        }

                        if let email = user.email {
                            Text(email)
                                .font(.system(size: 13))
                                .foregroundColor(Theme.textDim)
                        }

                        if user.emailVerified == false {
                            EmailVerificationBanner()
                        }
                    }
                }
                .padding(.top, Theme.spacing16)

                // Mode tabs
                HStack(spacing: 0) {
                    ForEach([GameMode.film, .series, .wiki], id: \.title) { mode in
                        Button(mode.title) { selectedMode = mode }
                            .font(.system(size: 13, weight: selectedMode == mode ? .semibold : .regular))
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

                // Achievements
                AchievementsSection()
                    .padding(.horizontal, Theme.spacing16)

                // Navigation links
                VStack(spacing: Theme.spacing8) {
                    NavigationLink(destination: ArchiveView()) {
                        ProfileNavRow(icon: "calendar", label: "Historique", color: Theme.gold)
                    }
                    .buttonStyle(.plain)

                    NavigationLink(destination: SettingsView()) {
                        ProfileNavRow(icon: "gearshape", label: "Réglages", color: Theme.textDim)
                    }
                    .buttonStyle(.plain)

                    Button { showChangePassword = true } label: {
                        ProfileNavRow(icon: "lock", label: "Changer le mot de passe", color: Theme.textDim)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, Theme.spacing16)

                Spacer(minLength: Theme.spacing24)
            }
        }
    }

    private func uploadAvatar(_ item: PhotosPickerItem) async {
        avatarUploading = true
        defer { avatarUploading = false; avatarItem = nil }
        guard let data = try? await item.loadTransferable(type: Data.self) else { return }
        // Compress to JPEG at 0.8 quality using UIImage
        let compressed: Data
        if let uiImage = UIImage(data: data),
           let jpeg = uiImage.jpegData(compressionQuality: 0.8) {
            compressed = jpeg
        } else {
            compressed = data
        }
        do {
            let updated = try await APIClient.shared.uploadAvatar(imageData: compressed)
            try await auth.updateProfile(avatarUrl: updated.avatarUrl)
        } catch {}
    }
}

// MARK: - Stats panel

private struct StatsPanel: View {
    let mode: GameMode
    private var stats: LocalStats { StatsManager.shared.stats(for: mode) }

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

    private var resolvedURL: URL? {
        guard let url else { return nil }
        if url.hasPrefix("http://") || url.hasPrefix("https://") {
            return URL(string: url)
        }
        // Relative path — prepend backend base URL
        return URL(string: APIClient.baseURL + url)
    }

    var body: some View {
        Group {
            if let imageURL = resolvedURL {
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

// MARK: - Notification settings

private struct NotificationSettingsSection: View {
    @State private var isEnabled = NotificationManager.shared.isEnabled
    @State private var authStatus: UNAuthorizationStatus = .notDetermined
    @State private var reminderHour = NotificationManager.shared.reminderHour

    private let hours = Array(5...23)

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Text("Notifications")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            VStack(spacing: 0) {
                // Toggle
                HStack {
                    Label("Rappel quotidien", systemImage: "bell.fill")
                        .font(.system(size: 15))
                        .foregroundColor(Theme.text)
                    Spacer()
                    if authStatus == .denied {
                        Button("Activer dans Réglages") { openSettings() }
                            .font(.system(size: 12))
                            .foregroundColor(Theme.gold)
                    } else {
                        Toggle("", isOn: $isEnabled)
                            .tint(Theme.gold)
                            .onChange(of: isEnabled) { _, newVal in
                                if newVal && authStatus == .notDetermined {
                                    requestPermission()
                                } else {
                                    NotificationManager.shared.isEnabled = newVal
                                }
                            }
                    }
                }
                .padding(Theme.spacing12)

                if isEnabled && authStatus != .denied {
                    Divider().background(Theme.border).padding(.horizontal, Theme.spacing12)

                    // Hour picker
                    HStack {
                        Label("Heure du rappel", systemImage: "clock")
                            .font(.system(size: 14))
                            .foregroundColor(Theme.textDim)
                        Spacer()
                        Picker("", selection: $reminderHour) {
                            ForEach(hours, id: \.self) { h in
                                Text(String(format: "%02d:00", h)).tag(h)
                            }
                        }
                        .pickerStyle(.menu)
                        .tint(Theme.gold)
                        .onChange(of: reminderHour) { _, h in
                            NotificationManager.shared.reminderHour = h
                        }
                    }
                    .padding(Theme.spacing12)
                }
            }
            .background(Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        }
        .onAppear { checkStatus() }
    }

    private func checkStatus() {
        NotificationManager.shared.checkAuthorizationStatus { status in
            authStatus = status
            if status == .denied { isEnabled = false }
        }
    }

    private func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async {
                authStatus = granted ? .authorized : .denied
                isEnabled = granted
                NotificationManager.shared.isEnabled = granted
            }
        }
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - Achievements

private struct Achievement: Identifiable {
    let id: String
    let title: String
    let description: String
    let unlockHint: String
    let icon: String
    let color: Color
    let isEarned: Bool
}

private extension Achievement {
    @MainActor static func build(from sm: StatsManager) -> [Achievement] {
        let film   = sm.stats(for: .film)
        let series = sm.stats(for: .series)
        let wiki   = sm.stats(for: .wiki)

        let totalWins   = film.wins + series.wins + wiki.wins
        let totalPlayed = film.gamesPlayed + series.gamesPlayed + wiki.gamesPlayed
        let maxStreak   = max(film.maxStreak, series.maxStreak, wiki.maxStreak)
        let firstGuess  = (film.distribution["1"] ?? 0) + (series.distribution["1"] ?? 0) + (wiki.distribution["1"] ?? 0)

        return [
            Achievement(id: "first_win",   title: "Première victoire",  description: "Gagner une partie",              unlockHint: "Trouve la réponse correcte dans n'importe quel mode (Films, Séries ou Personnalités).",                                icon: "star.fill",          color: Theme.gold,             isEarned: totalWins >= 1),
            Achievement(id: "speed_run",   title: "Coup de maître",     description: "Trouver du premier essai",       unlockHint: "Propose la bonne réponse dès ton premier essai sans aucun indice. Ça demande du flair !",                            icon: "bolt.fill",          color: Theme.amber,            isEarned: firstGuess >= 1),
            Achievement(id: "plays_10",    title: "Habitué",            description: "10 parties jouées",             unlockHint: "Joue 10 parties au total, peu importe le mode ou le résultat. Continue comme ça !",                                  icon: "gamecontroller.fill", color: Theme.green,           isEarned: totalPlayed >= 10),
            Achievement(id: "streak_7",    title: "Série de feu",       description: "7 jours consécutifs",           unlockHint: "Gagne une partie chaque jour pendant 7 jours d'affilée. Un seul mode suffit par jour.",                              icon: "flame.fill",         color: Color.orange,           isEarned: maxStreak >= 7),
            Achievement(id: "streak_30",   title: "Invincible",         description: "30 jours consécutifs",          unlockHint: "Gagne une partie chaque jour pendant 30 jours sans interruption. La régularité est la clé.",                         icon: "crown.fill",         color: Theme.gold,             isEarned: maxStreak >= 30),
            Achievement(id: "wins_50",     title: "Cinéphile",          description: "50 victoires au total",         unlockHint: "Accumule 50 victoires en tout, tous modes confondus. Joue régulièrement pour y arriver.",                            icon: "trophy.fill",        color: Theme.gold,             isEarned: totalWins >= 50),
            Achievement(id: "wins_100",    title: "Légende",            description: "100 victoires au total",        unlockHint: "Atteins 100 victoires cumulées. Une récompense réservée aux joueurs les plus assidus.",                             icon: "medal.fill",         color: Color(hex: "#8b6ff0"),  isEarned: totalWins >= 100),
            Achievement(id: "film_master", title: "Maître du 7e art",   description: "50 films trouvés",              unlockHint: "Trouve 50 films dans le mode Films. Lance-toi tous les jours pour atteindre ce palier.",                            icon: "film.fill",          color: Theme.gold,             isEarned: film.wins >= 50),
            Achievement(id: "wiki_master", title: "Encyclopédiste",     description: "50 personnalités trouvées",     unlockHint: "Identifie 50 personnalités dans le mode Personnalités. Culture générale et indices progressifs t'attendent.",        icon: "brain.fill",         color: Theme.green,            isEarned: wiki.wins >= 50),
        ]
    }
}

private struct AchievementsSection: View {
    private let sm = StatsManager.shared
    private var achievements: [Achievement] { Achievement.build(from: sm) }
    private var earned: [Achievement] { achievements.filter(\.isEarned) }
    private var locked: [Achievement] { achievements.filter { !$0.isEarned } }
    @State private var selectedLocked: Achievement?

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            HStack {
                Text("Succès")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Theme.textDim)
                    .textCase(.uppercase)
                    .tracking(1)
                Spacer()
                Text("\(earned.count)/\(achievements.count)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Theme.muted)
            }

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: Theme.spacing8) {
                ForEach(earned) { badge in
                    AchievementBadge(achievement: badge, earned: true)
                }
                ForEach(locked) { badge in
                    Button { selectedLocked = badge } label: {
                        AchievementBadge(achievement: badge, earned: false)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .sheet(item: $selectedLocked) { achievement in
            AchievementDetailSheet(achievement: achievement)
        }
    }
}

private struct AchievementBadge: View {
    let achievement: Achievement
    let earned: Bool
    @State private var appeared = false

    var body: some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(earned ? achievement.color.opacity(0.15) : Theme.surfaceAlt.opacity(0.5))
                    .frame(width: 48, height: 48)
                Image(systemName: earned ? achievement.icon : "lock.fill")
                    .font(.system(size: 20))
                    .foregroundColor(earned ? achievement.color : Theme.muted)
                    .symbolEffect(.bounce, value: appeared)
            }
            Text(achievement.title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(earned ? Theme.text : Theme.muted)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            if earned {
                Text(achievement.description)
                    .font(.system(size: 9))
                    .foregroundColor(Theme.muted)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Theme.spacing8)
        .padding(.horizontal, 4)
        .background(earned ? Theme.surface : Theme.surfaceAlt.opacity(0.3))
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(earned ? achievement.color.opacity(0.25) : Theme.border.opacity(0.3), lineWidth: 1))
        .opacity(earned ? 1 : 0.5)
        .scaleEffect(appeared ? 1 : 0.88)
        .onAppear {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7).delay(earned ? 0.1 : 0)) {
                appeared = true
            }
        }
    }
}

// MARK: - Profile nav row

private struct ProfileNavRow: View {
    let icon: String
    let label: String
    let color: Color

    var body: some View {
        HStack(spacing: Theme.spacing12) {
            Image(systemName: icon)
                .font(.system(size: 15))
                .foregroundColor(color)
                .frame(width: 28, alignment: .center)
            Text(label)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(Theme.text)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.muted)
        }
        .padding(.horizontal, Theme.spacing16)
        .padding(.vertical, 14)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
    }
}

// MARK: - Achievement detail sheet

private struct AchievementDetailSheet: View {
    let achievement: Achievement
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                VStack(spacing: Theme.spacing24) {
                    // Icon
                    ZStack {
                        Circle()
                            .fill(Theme.surfaceAlt)
                            .frame(width: 88, height: 88)
                        Image(systemName: "lock.fill")
                            .font(.system(size: 32))
                            .foregroundColor(Theme.muted)
                    }
                    .padding(.top, Theme.spacing24)

                    // Title + description
                    VStack(spacing: 8) {
                        Text(achievement.title)
                            .font(.custom("Georgia", size: 22))
                            .fontWeight(.bold)
                            .foregroundColor(Theme.text)
                            .multilineTextAlignment(.center)

                        Text(achievement.description)
                            .font(.system(size: 15))
                            .foregroundColor(Theme.textDim)
                            .multilineTextAlignment(.center)
                            .lineSpacing(3)
                    }
                    .padding(.horizontal, Theme.spacing24)

                    // What to do card
                    VStack(alignment: .leading, spacing: Theme.spacing12) {
                        Label("Comment débloquer", systemImage: "info.circle")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Theme.gold)

                        Text(achievement.unlockHint)
                            .font(.system(size: 14))
                            .foregroundColor(Theme.text)
                            .lineSpacing(3)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(Theme.spacing16)
                    .background(Theme.surface)
                    .cornerRadius(Theme.radiusM)
                    .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
                    .padding(.horizontal, Theme.spacing16)

                    Spacer()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fermer") { dismiss() }
                        .foregroundColor(Theme.gold)
                        .font(.system(size: 15, weight: .semibold))
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
    }
}

// MARK: - Email verification banner

private struct EmailVerificationBanner: View {
    @State private var isSending = false
    @State private var sent = false

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.circle")
                .font(.system(size: 12))
                .foregroundColor(Theme.amber)
            Text(sent ? "Email envoyé !" : "Email non vérifié")
                .font(.system(size: 12))
                .foregroundColor(Theme.amber)
            Spacer()
            if !sent {
                Button(isSending ? "Envoi…" : "Renvoyer") {
                    guard !isSending else { return }
                    Task {
                        isSending = true
                        try? await APIClient.shared.resendVerificationEmail()
                        sent = true
                        isSending = false
                    }
                }
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.gold)
                .disabled(isSending)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Theme.amber.opacity(0.08))
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.amber.opacity(0.25), lineWidth: 1))
    }
}

// MARK: - Edit name sheet

struct EditNameView: View {
    @Environment(AuthViewModel.self) var auth
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                VStack(spacing: Theme.spacing16) {
                    AuthTextField(placeholder: "Nouveau pseudo", text: $name, contentType: .name)
                        .padding(.horizontal, Theme.spacing16)
                        .padding(.top, Theme.spacing24)
                    if let error {
                        Text(error).font(.system(size: 13)).foregroundColor(Theme.red)
                    }
                    Button("Enregistrer") { Task { await save() } }
                        .buttonStyle(PrimaryButtonStyle(isLoading: isLoading))
                        .disabled(isLoading || name.trimmingCharacters(in: .whitespaces).isEmpty)
                        .padding(.horizontal, Theme.spacing16)
                    Spacer()
                }
            }
            .navigationTitle("Modifier le pseudo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }.foregroundColor(Theme.textDim)
                }
            }
        }
        .onAppear { name = auth.user?.displayName ?? "" }
    }

    private func save() async {
        isLoading = true; error = nil
        defer { isLoading = false }
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        do {
            try await auth.updateProfile(displayName: trimmed)
            dismiss()
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
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
