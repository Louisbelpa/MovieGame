import SwiftUI

struct OnboardingView: View {
    let onFinish: () -> Void

    @State private var page = 0
    @State private var notifGranted = false

    private let pages: [OnboardingPage] = [
        OnboardingPage(
            id: 0,
            icon: nil,
            logoText: "GT",
            title: "Bienvenue sur\nGuessToday",
            subtitle: "Le défi quotidien de culture générale. Films, séries, personnalités — trois devinettes par jour.",
            accentColor: Theme.gold
        ),
        OnboardingPage(
            id: 1,
            icon: nil,
            logoText: nil,
            title: "Trois défis chaque jour",
            subtitle: nil,
            accentColor: Theme.gold
        ),
        OnboardingPage(
            id: 2,
            icon: "flame.fill",
            logoText: nil,
            title: "Construisez votre série",
            subtitle: "Jouez tous les jours pour maintenir votre streak. Défiez vos amis et comparez vos scores.",
            accentColor: Theme.amber
        ),
        OnboardingPage(
            id: 3,
            icon: "globe",
            logoText: nil,
            title: "Vous jouiez sur le site ?",
            subtitle: nil,
            accentColor: Theme.gold
        ),
        OnboardingPage(
            id: 4,
            icon: "bell.badge.fill",
            logoText: nil,
            title: "Ne ratez aucun défi",
            subtitle: "Activez les notifications pour recevoir une alerte chaque jour à l'arrivée du nouveau défi.",
            accentColor: Theme.gold
        ),
    ]

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            VStack(spacing: 0) {
                // Page content
                TabView(selection: $page) {
                    ForEach(pages) { p in
                        pageView(p)
                            .tag(p.id)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut(duration: 0.3), value: page)

                // Bottom controls
                VStack(spacing: Theme.spacing16) {
                    // Page dots
                    HStack(spacing: 8) {
                        ForEach(0..<pages.count, id: \.self) { i in
                            Capsule()
                                .fill(i == page ? Theme.gold : Theme.surfaceAlt)
                                .frame(width: i == page ? 20 : 7, height: 7)
                                .animation(.spring(response: 0.3), value: page)
                        }
                    }

                    // CTA button
                    if page == pages.count - 1 {
                        VStack(spacing: Theme.spacing12) {
                            Button {
                                requestNotifications()
                            } label: {
                                Label("Activer les notifications", systemImage: "bell.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())

                            Button("Passer") { onFinish() }
                                .font(.system(size: 14))
                                .foregroundColor(Theme.textDim)
                        }
                    } else if page == 3 {
                        VStack(spacing: Theme.spacing12) {
                            Link(destination: URL(string: "https://guesstoday.fr?auth=register")!) {
                                Label("Créer mon compte sur le site", systemImage: "arrow.up.right.square")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())

                            Button("J'ai déjà un compte / continuer") {
                                withAnimation { page += 1 }
                            }
                            .font(.system(size: 14))
                            .foregroundColor(Theme.textDim)
                        }
                    } else {
                        VStack(spacing: Theme.spacing12) {
                            Button {
                                withAnimation { page += 1 }
                            } label: {
                                HStack(spacing: 6) {
                                    Text(page == 0 ? "Commencer" : "Suivant")
                                        .font(.system(size: 16, weight: .semibold))
                                    Image(systemName: "arrow.right")
                                        .font(.system(size: 14, weight: .semibold))
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())

                            Button("Passer l'intro") { onFinish() }
                                .font(.system(size: 14))
                                .foregroundColor(Theme.textDim)
                        }
                    }
                }
                .padding(.horizontal, Theme.spacing24)
                .padding(.bottom, 48)
            }
        }
    }

    @ViewBuilder
    private func pageView(_ p: OnboardingPage) -> some View {
        VStack(spacing: 0) {
            Spacer()

            // Illustration
            Group {
                if let logoText = p.logoText {
                    ZStack {
                        Circle()
                            .fill(p.accentColor.opacity(0.12))
                            .frame(width: 120, height: 120)
                        Text(logoText)
                            .font(Theme.fraunces(size: 52))
                            .fontWeight(.bold)
                            .foregroundColor(p.accentColor)
                    }
                } else if p.id == 1 {
                    ThreeModesIllustration()
                } else if p.id == 3 {
                    // Web transfer — no big icon, handled below
                    EmptyView()
                } else if let icon = p.icon {
                    ZStack {
                        Circle()
                            .fill(p.accentColor.opacity(0.12))
                            .frame(width: 120, height: 120)
                        Image(systemName: icon)
                            .font(.system(size: 48))
                            .foregroundStyle(p.accentColor)
                            .symbolRenderingMode(.hierarchical)
                    }
                }
            }
            .padding(.bottom, 40)

            // Text
            if p.id == 3 {
                WebTransferPageContent()
                    .padding(.horizontal, Theme.spacing24)
            } else {
                VStack(spacing: 14) {
                    Text(p.title)
                        .font(Theme.fraunces(size: 28))
                        .fontWeight(.bold)
                        .foregroundColor(Theme.text)
                        .multilineTextAlignment(.center)

                    if let subtitle = p.subtitle {
                        Text(subtitle)
                            .font(.system(size: 16))
                            .foregroundColor(Theme.textDim)
                            .multilineTextAlignment(.center)
                            .lineSpacing(4)
                            .padding(.horizontal, Theme.spacing8)
                    }
                }
                .padding(.horizontal, Theme.spacing24)
            }

            Spacer()
            Spacer()
        }
    }

    private func requestNotifications() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            DispatchQueue.main.async {
                if granted {
                    UIApplication.shared.registerForRemoteNotifications()
                    NotificationManager.shared.isEnabled = true
                }
                onFinish()
            }
        }
    }
}

// MARK: - Three modes illustration

private struct ThreeModesIllustration: View {
    private let modes: [(icon: String, title: String, color: Color)] = [
        ("film",               "Films",          Theme.gold),
        ("tv",                 "Séries",          Color(hex: "#8b6ff0")),
        ("building.columns",   "Personnalités",   Theme.green),
    ]

    var body: some View {
        HStack(spacing: 14) {
            ForEach(modes, id: \.title) { mode in
                VStack(spacing: 10) {
                    Image(systemName: mode.icon)
                        .font(.system(size: 26))
                        .foregroundColor(mode.color)
                        .frame(width: 60, height: 60)
                        .background(mode.color.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 16))

                    Text(mode.title)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Theme.textDim)
                }
            }
        }
    }
}

// MARK: - Web transfer page content

private struct WebTransferPageContent: View {
    var body: some View {
        VStack(spacing: Theme.spacing24) {
            // Icon
            ZStack {
                Circle()
                    .fill(Theme.gold.opacity(0.12))
                    .frame(width: 100, height: 100)
                Image(systemName: "globe")
                    .font(.system(size: 44))
                    .foregroundStyle(Theme.gold)
            }

            VStack(spacing: 10) {
                Text("Vous jouiez sur le site ?")
                    .font(Theme.fraunces(size: 26))
                    .fontWeight(.bold)
                    .foregroundColor(Theme.text)
                    .multilineTextAlignment(.center)

                (
                    Text("Vos statistiques sont stockées dans votre navigateur. Pour ne pas les perdre,")
                        .foregroundColor(Theme.textDim)
                    + Text(" créez d'abord votre compte sur guesstoday.fr")
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.text)
                    + Text(" — vos données seront automatiquement importées.")
                        .foregroundColor(Theme.textDim)
                )
                .font(.system(size: 15))
                .multilineTextAlignment(.center)
                .lineSpacing(3)
            }
        }
    }
}

// MARK: - Model

private struct OnboardingPage: Identifiable {
    let id: Int
    let icon: String?
    let logoText: String?
    let title: String
    let subtitle: String?
    let accentColor: Color
}
