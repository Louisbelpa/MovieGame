import SwiftUI
import UserNotifications
import PhotosUI

struct ProfileView: View {
    @Environment(AuthViewModel.self) var auth
    @State private var showLogin = false
    @State private var showChangePassword = false
    @State private var showEditName = false
    @State private var selectedMode: GameMode? = nil   // nil = tous les modes

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                if !auth.isLoggedIn {
                    GuestProfileView(showLogin: $showLogin)
                } else if let currentUser = auth.user {
                    LoggedInProfileView(
                        user: currentUser,
                        selectedMode: $selectedMode,   // GameMode? — nil = Tous
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
                        .accessibilityLabel("Se déconnecter")
                    }
                }
            }
        }
        .sheet(isPresented: $showLogin) {
            LoginView().environment(auth)
        }
        .sheet(isPresented: $showChangePassword) {
            ChangePasswordView().environment(auth)
        }
        .sheet(isPresented: $showEditName) {
            EditNameView().environment(auth)
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
            #if DEBUG || NRT
            NavigationLink(destination: DebugMenuView()) {
                HStack(spacing: 5) {
                    Image(systemName: "wrench.and.screwdriver")
                        .font(.system(size: 11))
                    Text("Debug — \(EnvironmentManager.shared.current.displayName)")
                        .font(.system(size: 12))
                }
                .foregroundColor(Theme.amber)
            }
            .padding(.bottom, Theme.spacing8)
            #endif

            NavigationLink(destination: AboutView()) {
                Text("À propos · Confidentialité · Mentions légales")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.muted)
                    .multilineTextAlignment(.center)
            }
            .padding(.bottom, Theme.spacing24)
        }
    }
}

// MARK: - Logged-in view

private struct LoggedInProfileView: View {
    let user: User
    @Binding var selectedMode: GameMode?   // nil = Tous
    @Binding var showChangePassword: Bool
    @Binding var showEditName: Bool

    @Environment(AuthViewModel.self) var auth
    @State private var avatarItem: PhotosPickerItem?
    @State private var avatarUploading = false
    @State private var avatarError: String?
    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var deleteError: String?

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
                        avatarError = nil
                        Task { await uploadAvatar(item) }
                    }

                    VStack(spacing: 4) {
                        if let avatarError {
                            Text(avatarError)
                                .font(.system(size: 11))
                                .foregroundColor(Theme.red)
                                .multilineTextAlignment(.center)
                        }
                        HStack(spacing: 6) {
                            Text(user.displayName)
                                .font(Theme.fraunces(size: 22))
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

                    }
                }
                .padding(.top, Theme.spacing16)

                // Mode tabs — pill style
                HStack(spacing: 4) {
                    // "Tous" tab
                    let isTotalActive = selectedMode == nil
                    Button("Tous") {
                        withAnimation(.easeInOut(duration: 0.18)) { selectedMode = nil }
                    }
                    .font(.system(size: 13, weight: isTotalActive ? .semibold : .regular))
                    .foregroundColor(isTotalActive ? Theme.text : Theme.textDim)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(isTotalActive ? Theme.text.opacity(0.10) : Color.clear)
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isTotalActive ? Theme.border : Color.clear, lineWidth: 1)
                    )

                    ForEach([GameMode.film, .series, .wiki], id: \.title) { mode in
                        let isActive = selectedMode == mode
                        let activeColor = mode.color
                        Button(mode.title) {
                            withAnimation(.easeInOut(duration: 0.18)) { selectedMode = mode }
                        }
                        .font(.system(size: 13, weight: isActive ? .semibold : .regular))
                        .foregroundColor(isActive ? activeColor : Theme.textDim)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(isActive ? activeColor.opacity(0.14) : Color.clear)
                        .cornerRadius(8)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(isActive ? Theme.border : Color.clear, lineWidth: 1)
                        )
                    }
                }
                .padding(3)
                .background(Theme.surfaceAlt)
                .cornerRadius(Theme.radiusM)
                .padding(.horizontal, Theme.spacing16)

                // Stats for selected mode (nil = aggregate)
                StatsPanel(mode: selectedMode)
                    .padding(.horizontal, Theme.spacing16)

                // Achievements
                AchievementsSection()
                    .padding(.horizontal, Theme.spacing16)

                // Notification promo (shown only when not yet enabled)
                NotificationPromoCard()
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

                    NavigationLink(destination: AboutView()) {
                        ProfileNavRow(icon: "info.circle", label: "À propos & légal", color: Theme.textDim)
                    }
                    .buttonStyle(.plain)

                    #if DEBUG || NRT
                    NavigationLink(destination: DebugMenuView()) {
                        ProfileNavRow(icon: "wrench.and.screwdriver", label: "Debug (\(EnvironmentManager.shared.current.displayName))", color: Theme.amber)
                    }
                    .buttonStyle(.plain)
                    #endif

                    Button {
                        showDeleteConfirm = true
                    } label: {
                        ProfileNavRow(icon: "trash", label: "Supprimer mon compte", color: Theme.red)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, Theme.spacing16)

                Spacer(minLength: Theme.spacing24)
            }
        }
        .task { await StatsManager.shared.refreshFromServer() }
        .alert("Erreur", isPresented: .init(
            get: { deleteError != nil },
            set: { if !$0 { deleteError = nil } }
        )) {
            Button("OK", role: .cancel) { deleteError = nil }
        } message: {
            Text(deleteError ?? "")
        }
        .confirmationDialog(
            "Supprimer mon compte",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Supprimer définitivement", role: .destructive) {
                Task { await deleteAccount() }
            }
            Button("Annuler", role: .cancel) {}
        } message: {
            Text("Cette action est irréversible. Toutes vos données seront supprimées.")
        }
    }

    private func deleteAccount() async {
        isDeleting = true
        do {
            try await auth.deleteAccount()
        } catch let e as APIError {
            deleteError = e.localizedDescription
        } catch {
            deleteError = error.localizedDescription
        }
        isDeleting = false
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
        } catch let e as APIError {
            avatarError = e.localizedDescription
        } catch {
            avatarError = "Erreur lors de l'envoi de la photo."
        }
    }
}

// MARK: - Stats panel

private struct StatsPanel: View {
    let mode: GameMode?   // nil = agrégat tous modes

    private var stats: LocalStats {
        guard let mode else { return aggregateStats() }
        return StatsManager.shared.stats(for: mode)
    }

    private func aggregateStats() -> LocalStats {
        let film   = StatsManager.shared.stats(for: .film)
        let series = StatsManager.shared.stats(for: .series)
        let wiki   = StatsManager.shared.stats(for: .wiki)
        var total  = LocalStats()
        total.gamesPlayed    = film.gamesPlayed + series.gamesPlayed + wiki.gamesPlayed
        total.wins           = film.wins + series.wins + wiki.wins
        total.currentStreak  = max(film.currentStreak, series.currentStreak, wiki.currentStreak)
        total.maxStreak      = max(film.maxStreak, series.maxStreak, wiki.maxStreak)
        var dist: [String: Int] = [:]
        for (k, v) in film.distribution   { dist[k, default: 0] += v }
        for (k, v) in series.distribution { dist[k, default: 0] += v }
        for (k, v) in wiki.distribution   { dist[k, default: 0] += v }
        total.distribution = dist
        return total
    }

    var body: some View {
        VStack(spacing: Theme.spacing16) {
            // Summary row
            HStack {
                StatBox(label: "Joués", value: "\(stats.gamesPlayed)")
                Divider().frame(height: 36).background(Theme.border)
                StatBox(label: "Victoires", value: "\(stats.wins)")
                Divider().frame(height: 36).background(Theme.border)
                StatBox(label: "En cours", value: "\(stats.currentStreak)")
                Divider().frame(height: 36).background(Theme.border)
                StatBox(label: "Record", value: "\(stats.maxStreak)")
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

// MARK: - Notification promo card

struct NotificationPromoCard: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var authStatus: UNAuthorizationStatus = .notDetermined
    @State private var isRequesting = false

    var body: some View {
        Group {
            if authStatus != .authorized {
                VStack(spacing: 0) {
                    HStack(spacing: Theme.spacing12) {
                        ZStack {
                            Circle()
                                .fill(Theme.gold.opacity(0.15))
                                .frame(width: 44, height: 44)
                            Image(systemName: "bell.badge.fill")
                                .font(.system(size: 20))
                                .foregroundColor(Theme.gold)
                        }

                        VStack(alignment: .leading, spacing: 3) {
                            Text("Rappels quotidiens")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(Theme.text)
                            Text("Ne manquez aucun défi. On vous prévient quand le nouveau défi arrive.")
                                .font(.system(size: 12))
                                .foregroundColor(Theme.textDim)
                                .lineSpacing(2)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        Spacer(minLength: 4)
                    }
                    .padding(Theme.spacing16)

                    Divider().background(Theme.border)

                    if authStatus == .denied {
                        Button {
                            if let url = URL(string: UIApplication.openSettingsURLString) {
                                UIApplication.shared.open(url)
                            }
                        } label: {
                            Text("Ouvrir les Réglages")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(Theme.gold)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                        }
                    } else {
                        Button {
                            requestPermission()
                        } label: {
                            HStack(spacing: 6) {
                                if isRequesting {
                                    ProgressView().scaleEffect(0.7).tint(Theme.background)
                                }
                                Text("Activer les notifications")
                                    .font(.system(size: 14, weight: .semibold))
                            }
                            .foregroundColor(Theme.background)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(
                                Theme.goldGradient
                            )
                        }
                        .disabled(isRequesting)
                    }
                }
                .background(Theme.surface)
                .cornerRadius(Theme.radiusM)
                .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.gold.opacity(0.3), lineWidth: 1))
            }
        }
        .onAppear { checkStatus() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { checkStatus() }
        }
    }

    private func checkStatus() {
        NotificationManager.shared.checkAuthorizationStatus { status in
            authStatus = status
            if status == .authorized {
                NotificationManager.shared.isEnabled = true
            }
        }
    }

    private func requestPermission() {
        isRequesting = true
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async {
                isRequesting = false
                authStatus = granted ? .authorized : .denied
                if granted {
                    NotificationManager.shared.isEnabled = true
                }
            }
        }
    }
}

// MARK: - Notification settings

private struct NotificationSettingsSection: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var isEnabled = NotificationManager.shared.isEnabled
    @State private var authStatus: UNAuthorizationStatus = .notDetermined
    @State private var reminderHour = NotificationManager.shared.reminderHour

    private let hours = NotificationManager.availableHours

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

                    // Time picker
                    HStack {
                        Label("Heure du rappel", systemImage: "clock")
                            .font(.system(size: 14))
                            .foregroundColor(Theme.textDim)
                        Spacer()
                        Picker("", selection: $reminderHour) {
                            ForEach(hours, id: \.self) { h in
                                Text(String(format: "%02dh00", h)).tag(h)
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
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { checkStatus() }
        }
    }

    private func checkStatus() {
        NotificationManager.shared.checkAuthorizationStatus { status in
            authStatus = status
            if status == .denied {
                isEnabled = false
            } else if status == .authorized {
                isEnabled = NotificationManager.shared.isEnabled
            }
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
    @State private var selected: Achievement?

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

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.spacing8) {
                    ForEach(achievements) { badge in
                        Button { if !badge.isEarned { selected = badge } } label: {
                            AchievementBadge(achievement: badge, earned: badge.isEarned)
                        }
                        .buttonStyle(.plain)
                        .disabled(badge.isEarned)
                    }
                }
                .padding(.horizontal, Theme.spacing16)
                .padding(.vertical, 4)
            }
            .padding(.horizontal, -Theme.spacing16) // déborde jusqu'aux bords
        }
        .sheet(item: $selected) { achievement in
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
        .frame(width: 80)
        .padding(.vertical, Theme.spacing8)
        .padding(.horizontal, 4)
        .background(earned ? Theme.surface : Theme.surfaceAlt.opacity(0.3))
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(earned ? achievement.color.opacity(0.25) : Theme.border.opacity(0.3), lineWidth: 1))
        .opacity(earned ? 1 : 0.45)
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
                            .font(Theme.fraunces(size: 22))
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

// MARK: - About view

struct AboutView: View {
    private let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    private let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: Theme.spacing24) {

                    // App identity
                    VStack(spacing: Theme.spacing8) {
                        ApertureIconView(size: 64)
                        (
                            Text("Guess")
                                .font(Theme.fraunces(size: 28)).foregroundColor(Theme.text)
                            + Text("today")
                                .font(Theme.fraunces(size: 28, italic: true))
                                .foregroundStyle(Theme.goldGradient)
                        )
                        Text("Version \(appVersion) (\(buildNumber))")
                            .font(.system(size: 12))
                            .foregroundColor(Theme.muted)
                    }
                    .padding(.top, Theme.spacing8)

                    // Sources de données
                    AboutSection(title: "Sources de données") {
                        AboutLinkRow(
                            icon: "film",
                            iconColor: Theme.gold,
                            title: "The Movie Database",
                            subtitle: "Films & séries — données, images",
                            url: URL(string: "https://www.themoviedb.org")!,
                            note: "Ce produit utilise l'API TMDB mais n'est pas approuvé ou certifié par TMDB."
                        )
                        Divider().background(Theme.border).padding(.leading, 52)
                        AboutLinkRow(
                            icon: "person.bust",
                            iconColor: Theme.modeWiki,
                            title: "Wikipédia",
                            subtitle: "Personnalités — biographies, données",
                            url: URL(string: "https://www.wikipedia.org")!,
                            note: "Contenu sous licence Creative Commons Attribution-ShareAlike."
                        )
                    }
                    .padding(.horizontal, Theme.spacing16)

                    // Contact
                    AboutSection(title: "Contact") {
                        AboutLinkRow(
                            icon: "envelope.fill",
                            iconColor: Theme.gold,
                            title: "Nous écrire",
                            subtitle: "contact@guesstoday.fr",
                            url: URL(string: "mailto:contact@guesstoday.fr")!
                        )
                    }
                    .padding(.horizontal, Theme.spacing16)

                    // Légal
                    AboutSection(title: "Légal") {
                        NavigationLink(destination: PrivacyView()) {
                            AboutNavRow(
                                icon: "lock.shield.fill",
                                iconColor: Theme.textDim,
                                title: "Politique de confidentialité"
                            )
                        }
                        .buttonStyle(.plain)
                        Divider().background(Theme.border).padding(.leading, 52)
                        AboutLinkRow(
                            icon: "doc.text.fill",
                            iconColor: Theme.textDim,
                            title: "Conditions d'utilisation",
                            subtitle: "guesstoday.fr/cgu",
                            url: URL(string: "https://guesstoday.fr/cgu")!
                        )
                        Divider().background(Theme.border).padding(.leading, 52)
                        AboutLinkRow(
                            icon: "globe",
                            iconColor: Theme.textDim,
                            title: "Site web",
                            subtitle: "guesstoday.fr",
                            url: URL(string: "https://guesstoday.fr")!
                        )
                    }
                    .padding(.horizontal, Theme.spacing16)

                    Text("Fait avec ♥ à Paris")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.muted)
                        .padding(.bottom, Theme.spacing24)
                }
                .padding(.top, Theme.spacing16)
            }
        }
        .navigationTitle("À propos")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
}

private struct AboutSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            VStack(alignment: .leading, spacing: 0) {
                content()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        }
    }
}

private struct AboutLinkRow: View {
    let icon: String
    var iconColor: Color = Theme.textDim
    let title: String
    var subtitle: String? = nil
    let url: URL
    var note: String? = nil

    var body: some View {
        Link(destination: url) {
            HStack(spacing: Theme.spacing12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(iconColor.opacity(0.12))
                        .frame(width: 36, height: 36)
                    Image(systemName: icon)
                        .font(.system(size: 16))
                        .foregroundColor(iconColor)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(Theme.text)
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 12))
                            .foregroundColor(Theme.textDim)
                    }
                    if let note {
                        Text(note)
                            .font(.system(size: 11))
                            .foregroundColor(Theme.muted)
                            .multilineTextAlignment(.leading)
                            .lineSpacing(2)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 2)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Image(systemName: "arrow.up.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Theme.muted)
            }
            .padding(.horizontal, Theme.spacing16)
            .padding(.vertical, 12)
        }
    }
}

private struct AboutNavRow: View {
    let icon: String
    var iconColor: Color = Theme.textDim
    let title: String

    var body: some View {
        HStack(spacing: Theme.spacing12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(iconColor.opacity(0.12))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(iconColor)
            }

            Text(title)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(Theme.text)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.muted)
        }
        .padding(.horizontal, Theme.spacing16)
        .padding(.vertical, 12)
    }
}

// MARK: - Privacy view

struct PrivacyView: View {
    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.spacing24) {

                    PrivacySection(title: "Données collectées") {
                        PrivacyItem(
                            icon: "person.badge.key.fill",
                            title: "Compte utilisateur",
                            text: "Si vous créez un compte : adresse e-mail et nom d'affichage uniquement."
                        )
                        PrivacyItem(
                            icon: "clock.fill",
                            title: "Statistiques de jeu",
                            text: "Vos résultats quotidiens (victoires, tentatives, série) sont sauvegardés sur nos serveurs si vous êtes connecté, en local sinon."
                        )
                        PrivacyItem(
                            icon: "chart.bar.fill",
                            title: "Statistiques anonymes",
                            text: "Des compteurs agrégés et anonymisés (nombre total de parties, distribution des tentatives) alimentent les statistiques communautaires."
                        )
                    }

                    PrivacySection(title: "Ce que nous ne collectons pas") {
                        PrivacyItem(
                            icon: "xmark.shield.fill",
                            title: "Aucune donnée personnelle",
                            text: "Pas de nom réel, pas de localisation, pas d'identifiant publicitaire, pas de données de santé."
                        )
                        PrivacyItem(
                            icon: "eye.slash.fill",
                            title: "Aucun suivi publicitaire",
                            text: "GuessToday ne contient aucun SDK publicitaire ni aucun traceur tiers."
                        )
                    }

                    PrivacySection(title: "Cookies & session") {
                        PrivacyItem(
                            icon: "lock.fill",
                            title: "Un seul cookie de session",
                            text: "Un cookie HTTP-only signé et chiffré, valable 30 jours, servant uniquement à maintenir votre connexion. Il n'est jamais partagé."
                        )
                    }

                    PrivacySection(title: "Sources tierces") {
                        PrivacyItem(
                            icon: "film",
                            title: "The Movie Database (TMDB)",
                            text: "Les données de films et séries (titres, images, directeurs, casting) proviennent de l'API TMDB. Leur utilisation est soumise aux conditions d'utilisation de TMDB."
                        )
                        PrivacyItem(
                            icon: "person.bust",
                            title: "Wikipédia & Wikidata",
                            text: "Les biographies et informations sur les personnalités sont issues de Wikipédia et Wikidata, sous licence Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0). GuessToday n'est pas affilié à la Wikimedia Foundation."
                        )
                    }

                    Text("Dernière mise à jour : mai 2026")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.muted)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, Theme.spacing24)
                }
                .padding(.horizontal, Theme.spacing16)
                .padding(.top, Theme.spacing16)
            }
        }
        .navigationTitle("Confidentialité")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
}

private struct PrivacySection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            VStack(alignment: .leading, spacing: 0) {
                content()
            }
            .background(Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        }
    }
}

private struct PrivacyItem: View {
    let icon: String
    let title: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: Theme.spacing12) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(Theme.textDim)
                .frame(width: 20)
                .padding(.top, 2)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(Theme.text)
                Text(text)
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textDim)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(.horizontal, Theme.spacing16)
        .padding(.vertical, 12)
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
