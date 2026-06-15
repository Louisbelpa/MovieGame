import SwiftUI
import UserNotifications

struct OnboardingView: View {
    let onFinish: () -> Void

    @State private var page = 0
    @State private var direction = 1  // +1 forward, -1 backward

    private let totalPages = 5

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            RadialGradient(
                colors: [pageAccent.opacity(0.07), .clear],
                center: UnitPoint(x: 0.5, y: 0.18),
                startRadius: 0,
                endRadius: 300
            )
            .animation(.easeInOut(duration: 0.5), value: page)
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Custom directional transition — replaces TabView(.page)
                ZStack {
                    switch page {
                    case 0: WelcomePage()
                    case 1: ModesPage()
                    case 2: StreakPage()
                    case 3: WebTransferPage()
                    default: NotificationsPage()
                    }
                }
                .id(page)
                .transition(
                    .asymmetric(
                        insertion: .move(edge: direction > 0 ? .trailing : .leading)
                            .combined(with: .opacity)
                            .combined(with: .scale(scale: 0.96, anchor: direction > 0 ? .leading : .trailing)),
                        removal: .move(edge: direction > 0 ? .leading : .trailing)
                            .combined(with: .opacity)
                            .combined(with: .scale(scale: 1.02, anchor: direction > 0 ? .trailing : .leading))
                    )
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .gesture(
                    DragGesture(minimumDistance: 40)
                        .onEnded { value in
                            let horizontal = value.translation.width
                            let vertical   = abs(value.translation.height)
                            guard abs(horizontal) > vertical else { return }
                            if horizontal < 0, page < totalPages - 1 {
                                direction = 1
                                withAnimation(.spring(response: 0.44, dampingFraction: 0.84)) { page += 1 }
                            } else if horizontal > 0, page > 0 {
                                direction = -1
                                withAnimation(.spring(response: 0.44, dampingFraction: 0.84)) { page -= 1 }
                            }
                        }
                )

                // Dots + CTA
                VStack(spacing: Theme.spacing16) {
                    HStack(spacing: 7) {
                        ForEach(0..<totalPages, id: \.self) { i in
                            Capsule()
                                .fill(i == page ? pageAccent : Theme.surfaceAlt)
                                .frame(width: i == page ? 22 : 7, height: 7)
                                .animation(.spring(response: 0.3), value: page)
                        }
                    }

                    if page == 4 {
                        VStack(spacing: Theme.spacing12) {
                            Button {
                                requestNotifications()
                            } label: {
                                Label("Activer les notifications", systemImage: "bell.fill")
                                    .font(Theme.inter(size: 16, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())

                            Button("Passer") { onFinish() }
                                .font(Theme.inter(size: 14))
                                .foregroundColor(Theme.textDim)
                        }
                    } else if page == 3 {
                        VStack(spacing: Theme.spacing12) {
                            Link(destination: MobileAuthHandoff.webRegisterURL) {
                                Label("Créer mon compte sur le site", systemImage: "arrow.up.right.square")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())

                            Button("J'ai déjà un compte / continuer") {
                                advance()
                            }
                            .font(Theme.inter(size: 14))
                            .foregroundColor(Theme.textDim)
                        }
                    } else {
                        VStack(spacing: Theme.spacing12) {
                            Button { advance() } label: {
                                HStack(spacing: 6) {
                                    Text(page == 0 ? "Commencer" : "Suivant")
                                        .font(Theme.inter(size: 16, weight: .semibold))
                                    Image(systemName: "arrow.right")
                                        .font(.system(size: 14, weight: .semibold))
                                }
                                .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())

                            Button("Passer l'intro") { onFinish() }
                                .font(Theme.inter(size: 14))
                                .foregroundColor(Theme.textDim)
                        }
                    }
                }
                .padding(.horizontal, Theme.spacing24)
                .padding(.bottom, 52)
            }
        }
    }

    private func advance() {
        direction = 1
        withAnimation(.spring(response: 0.44, dampingFraction: 0.84)) {
            page += 1
        }
    }

    private var pageAccent: Color {
        switch page {
        case 1: return Theme.modeFilm
        case 2: return Theme.amber
        case 3: return Theme.gold
        case 4: return Theme.green
        default: return Theme.gold
        }
    }

    private func requestNotifications() {
        UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
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

// MARK: - Carte-glyphe 3D Candy (hero des slides)

private struct OnbHeroCard: View {
    let systemIcon: String
    let accent: Color
    let accentDark: Color
    var size: CGFloat = 150

    var body: some View {
        RoundedRectangle(cornerRadius: 34, style: .continuous)
            .fill(accent)
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: systemIcon)
                    .font(.system(size: size * 0.42, weight: .bold))
                    .foregroundColor(.white)
            )
            .background(
                RoundedRectangle(cornerRadius: 34, style: .continuous)
                    .fill(accentDark)
                    .offset(y: 8)
            )
            .rotationEffect(.degrees(-4))
    }
}

// MARK: - Page 0 — Welcome

private struct WelcomePage: View {
    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: Theme.spacing20) {
                OnbHeroCard(systemIcon: "sparkles", accent: Theme.coral, accentDark: Theme.coralDark)

                Text("GuessToday")
                    .font(Theme.fraunces(size: 32))
                    .foregroundColor(Theme.ink)
            }

            Spacer().frame(height: 44)

            VStack(spacing: 12) {
                Text("Le défi quotidien\nde culture générale")
                    .font(Theme.fraunces(size: 26))
                    .foregroundColor(Theme.text)
                    .multilineTextAlignment(.center)

                Text("Films, séries, personnalités — trois devinettes\nnouvelles chaque jour.")
                    .font(Theme.inter(size: 15))
                    .foregroundColor(Theme.textDim)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
            .padding(.horizontal, Theme.spacing24)

            Spacer()
            Spacer()
        }
    }
}

// MARK: - Page 1 — Three modes

private struct ModesPage: View {
    private let modes: [(icon: String, title: String, desc: String, color: Color, colorDark: Color)] = [
        ("film",        "Films",         "Trouvez le film\nà partir de scènes",        Theme.coral, Theme.coralDark),
        ("tv",          "Séries",        "Retrouvez la série\nà partir d'extraits",    Theme.grape, Theme.grapeDark),
        ("person.fill", "Personnalités", "Identifiez la célébrité\nà partir d'indices", Theme.sky,  Theme.skyDark),
    ]

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: Theme.spacing24) {
                VStack(spacing: 10) {
                    Text("Trois défis chaque jour")
                        .font(Theme.fraunces(size: 26))
                        .foregroundColor(Theme.text)
                        .multilineTextAlignment(.center)

                    Text("Un nouveau défi par mode tous les jours à minuit.")
                        .font(Theme.inter(size: 14))
                        .foregroundColor(Theme.textDim)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, Theme.spacing24)

                HStack(spacing: 12) {
                    ForEach(modes, id: \.title) { mode in
                        VStack(spacing: 10) {
                            RoundedRectangle(cornerRadius: 15, style: .continuous)
                                .fill(mode.color)
                                .frame(width: 54, height: 54)
                                .overlay(Image(systemName: mode.icon).font(.system(size: 23, weight: .bold)).foregroundColor(.white))
                                .background(RoundedRectangle(cornerRadius: 15, style: .continuous).fill(mode.colorDark).offset(y: 4))

                            Text(mode.title)
                                .font(Theme.inter(size: 12, weight: .semibold))
                                .foregroundColor(Theme.ink)

                            Text(mode.desc)
                                .font(Theme.inter(size: 11))
                                .foregroundColor(Theme.ink2)
                                .multilineTextAlignment(.center)
                                .lineSpacing(2)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .padding(.horizontal, 8)
                        .candyCard(radius: Theme.radiusL)
                    }
                }
                .padding(.horizontal, Theme.spacing16)
            }

            Spacer()
            Spacer()
        }
    }
}

// MARK: - Page 2 — Streak

private struct StreakPage: View {
    @State private var animate = false

    private let days = ["L", "M", "M", "J", "V", "S", "D"]

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: Theme.spacing28) {
                OnbHeroCard(systemIcon: "flame.fill", accent: Theme.flame, accentDark: Theme.sunDark)
                    .scaleEffect(animate ? 1.0 : 0.92)
                    .animation(.spring(response: 0.5, dampingFraction: 0.7), value: animate)
                    .onAppear { animate = true }

                VStack(spacing: 10) {
                    Text("Construisez votre série")
                        .font(Theme.fraunces(size: 26))
                        .foregroundColor(Theme.text)
                        .multilineTextAlignment(.center)

                    Text("Jouez tous les jours pour alimenter votre flamme.\nDéfiez vos amis et comparez vos scores.")
                        .font(Theme.inter(size: 15))
                        .foregroundColor(Theme.textDim)
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                }
                .padding(.horizontal, Theme.spacing24)

                // Mini week visualization
                HStack(spacing: 8) {
                    ForEach(0..<7, id: \.self) { i in
                        VStack(spacing: 6) {
                            Text(days[i])
                                .font(Theme.inter(size: 10, weight: .medium))
                                .foregroundColor(Theme.muted)
                            ZStack {
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(i < 5 ? Theme.amber.opacity(0.18) : Theme.surfaceAlt)
                                    .frame(width: 34, height: 34)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 8)
                                            .stroke(i < 5 ? Theme.amber.opacity(0.3) : Theme.border, lineWidth: 1)
                                    )
                                if i < 5 {
                                    Image(systemName: "flame.fill")
                                        .font(.system(size: 13))
                                        .foregroundColor(Theme.amber)
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, Theme.spacing16)
            }

            Spacer()
            Spacer()
        }
    }
}

// MARK: - Page 3 — Web transfer

private struct WebTransferPage: View {
    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: Theme.spacing24) {
                OnbHeroCard(systemIcon: "arrow.triangle.2.circlepath", accent: Theme.coral, accentDark: Theme.coralDark)

                VStack(spacing: 12) {
                    Text("Vous jouiez\nsur le site ?")
                        .font(Theme.fraunces(size: 26))
                        .foregroundColor(Theme.text)
                        .multilineTextAlignment(.center)

                    (
                        Text("Vos statistiques sont dans votre navigateur. Pour ne pas les perdre, ")
                            .foregroundColor(Theme.textDim)
                        + Text("créez d'abord votre compte sur guesstoday.fr")
                            .fontWeight(.semibold)
                            .foregroundColor(Theme.text)
                        + Text(" — vos données seront importées automatiquement.")
                            .foregroundColor(Theme.textDim)
                    )
                    .font(Theme.inter(size: 15))
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                }
                .padding(.horizontal, Theme.spacing24)
            }

            Spacer()
            Spacer()
        }
    }
}

// MARK: - Page 4 — Notifications

private struct NotificationsPage: View {
    @State private var animate = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: Theme.spacing24) {
                OnbHeroCard(systemIcon: "bell.badge.fill", accent: Theme.correct, accentDark: Theme.correctDark)
                    .scaleEffect(animate ? 1.0 : 0.92)
                    .animation(.spring(response: 0.5, dampingFraction: 0.7), value: animate)
                    .onAppear { animate = true }

                VStack(spacing: 12) {
                    Text("Ne ratez aucun défi")
                        .font(Theme.fraunces(size: 26))
                        .foregroundColor(Theme.text)
                        .multilineTextAlignment(.center)

                    Text("Recevez une alerte chaque jour à minuit\nquand le nouveau défi est disponible.")
                        .font(Theme.inter(size: 15))
                        .foregroundColor(Theme.textDim)
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                }
                .padding(.horizontal, Theme.spacing24)
            }

            Spacer()
            Spacer()
        }
    }
}
