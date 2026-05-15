import SwiftUI
import CoreTransferable
import UniformTypeIdentifiers
import UserNotifications

struct WinSheet: View {
    @ObservedObject var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @AppStorage("notif_prompt_shown") private var notifPromptShown = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()
                ConfettiOverlay()

                ScrollView {
                    VStack(spacing: Theme.spacing20) {
                        // Header
                        WinHeaderView(challenge: vm.challenge)
                            .padding(.top, Theme.spacing24)

                        // Result card
                        if let result = vm.filmResult {
                            FilmResultCard(result: result)
                                .padding(.horizontal, Theme.spacing16)
                        } else if let result = vm.wikiResult {
                            WikiResultCard(result: result)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        // Stats row
                        if let c = vm.challenge {
                            StatsRow(attemptsUsed: c.attemptsUsed, hintsUsed: c.hintsRevealed)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        // Streak
                        let stats = vm.loadStats()
                        if stats.currentStreak > 1 {
                            HStack(spacing: 8) {
                                Image(systemName: "flame.fill")
                                    .foregroundColor(Theme.amber)
                                Text("Série de \(stats.currentStreak) !")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Theme.text)
                            }
                        }

                        // Action buttons
                        VStack(spacing: Theme.spacing8) {
                            ShareResultButtons(vm: vm)
                                .padding(.horizontal, Theme.spacing16)

                            Button("Fermer") { dismiss() }
                                .buttonStyle(SecondaryButtonStyle())
                                .padding(.horizontal, Theme.spacing16)
                        }
                        .padding(.bottom, Theme.spacing24)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Theme.muted)
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
        .onAppear { maybeRequestNotifications() }
    }

    private func maybeRequestNotifications() {
        guard !notifPromptShown else { return }
        notifPromptShown = true
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .notDetermined else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                    if granted {
                        DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
                        NotificationManager.shared.isEnabled = true
                    }
                }
            }
        }
    }
}

struct LoseSheet: View {
    @ObservedObject var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.spacing20) {
                        LoseHeaderView(challenge: vm.challenge)
                            .padding(.top, Theme.spacing24)

                        if let result = vm.filmResult {
                            FilmResultCard(result: result)
                                .padding(.horizontal, Theme.spacing16)
                        } else if let result = vm.wikiResult {
                            WikiResultCard(result: result)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        if let c = vm.challenge {
                            StatsRow(attemptsUsed: c.attemptsUsed, hintsUsed: c.hintsRevealed)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        VStack(spacing: Theme.spacing8) {
                            ShareResultButtons(vm: vm)
                                .padding(.horizontal, Theme.spacing16)

                            Button("Fermer") { dismiss() }
                                .buttonStyle(SecondaryButtonStyle())
                                .padding(.horizontal, Theme.spacing16)
                        }
                        .padding(.bottom, Theme.spacing24)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Theme.muted)
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
    }
}

// MARK: - Confetti

private struct ConfettiOverlay: View {
    @State private var particles: [ConfettiParticle] = []
    @State private var startTime: Date? = nil

    var body: some View {
        GeometryReader { geo in
            TimelineView(.animation(minimumInterval: 1/60, paused: startTime == nil)) { tl in
                Canvas { ctx, size in
                    guard let start = startTime else { return }
                    let elapsed = tl.date.timeIntervalSince(start)
                    for p in particles {
                        let t = max(0, elapsed - p.delay)
                        guard t > 0 && t < p.lifetime else { continue }

                        // Burst: fast initial expansion then gravity
                        let progress = t / p.lifetime
                        let burst = 1.0 - exp(-t * 4.5)           // fast launch
                        let gravity = t * t * 140 * p.gravityScale // downward pull
                        let x = p.originX + p.velX * burst * p.lifetime
                        let y = p.originY + p.velY * burst * p.lifetime + gravity

                        let fadeStart = p.lifetime * 0.55
                        let opacity = t > fadeStart
                            ? max(0, 1.0 - (t - fadeStart) / (p.lifetime - fadeStart))
                            : 1.0

                        var lctx = ctx
                        lctx.opacity = opacity
                        lctx.translateBy(x: x, y: y)
                        lctx.rotate(by: .degrees(p.rotation * progress * 3.5))
                        let rect = CGRect(x: -p.w / 2, y: -p.h / 2, width: p.w, height: p.h)
                        lctx.fill(Path(roundedRect: rect, cornerRadius: 1.5), with: .color(p.color))
                    }
                }
                .ignoresSafeArea()
            }
            .onAppear {
                let cx = geo.size.width / 2
                let cy = geo.size.height * 0.38   // slightly above center
                let colors: [Color] = [Theme.gold, Theme.green, Color(hex: "#8b6ff0"), Theme.amber, Color.pink, Color.cyan, .white, Theme.gold]
                particles = (0..<150).map { i in
                    // Random angle in full circle, biased upward (more particles go up/sideways)
                    let angleBias = Double.random(in: -Double.pi...Double.pi)
                    let speed = CGFloat.random(in: 80...260)
                    let velX = cos(angleBias) * speed
                    let velY = sin(angleBias) * speed - CGFloat.random(in: 20...80) // upward bias
                    return ConfettiParticle(
                        originX: cx + CGFloat.random(in: -18...18),
                        originY: cy + CGFloat.random(in: -18...18),
                        velX: velX,
                        velY: velY,
                        w: CGFloat.random(in: 5...14),
                        h: CGFloat.random(in: 4...9),
                        delay: Double(i) * 0.008,
                        rotation: Double.random(in: 90...540),
                        gravityScale: Double.random(in: 0.7...1.3),
                        lifetime: Double.random(in: 1.4...2.2),
                        color: colors[i % colors.count]
                    )
                }
                startTime = Date()
            }
        }
        .allowsHitTesting(false)
    }
}

private struct ConfettiParticle {
    let originX: CGFloat
    let originY: CGFloat
    let velX: CGFloat
    let velY: CGFloat
    let w: CGFloat
    let h: CGFloat
    let delay: Double
    let rotation: Double
    let gravityScale: Double
    let lifetime: Double
    let color: Color
}

// MARK: - Win header with animated trophy

private struct WinHeaderView: View {
    let challenge: ChallengePayload?
    @State private var appeared = false

    var body: some View {
        VStack(spacing: Theme.spacing8) {
            Image(systemName: "trophy.fill")
                .font(.system(size: 48))
                .foregroundStyle(Theme.gold)
                .symbolRenderingMode(.hierarchical)
                .symbolEffect(.bounce.up.byLayer, value: appeared)
                .scaleEffect(appeared ? 1 : 0.5)
                .opacity(appeared ? 1 : 0)

            Text("Bravo !")
                .font(.custom("Georgia", size: 26))
                .fontWeight(.bold)
                .foregroundColor(Theme.gold)
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 6)

            if let c = challenge {
                Text("En \(c.attemptsUsed) tentative\(c.attemptsUsed > 1 ? "s" : "")")
                    .font(.system(size: 15))
                    .foregroundColor(Theme.textDim)
                    .opacity(appeared ? 1 : 0)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.65).delay(0.1)) {
                appeared = true
            }
        }
    }
}

// MARK: - Lose header with animated reveal

private struct LoseHeaderView: View {
    let challenge: ChallengePayload?
    @State private var appeared = false
    @State private var shake = false

    var body: some View {
        VStack(spacing: Theme.spacing8) {
            ZStack {
                Circle()
                    .fill(Theme.red.opacity(0.12))
                    .frame(width: 80, height: 80)
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(Theme.red)
                    .symbolRenderingMode(.hierarchical)
                    .symbolEffect(.bounce.down.byLayer, value: appeared)
            }
            .scaleEffect(appeared ? 1 : 0.4)
            .opacity(appeared ? 1 : 0)
            .rotationEffect(.degrees(shake ? -4 : 0))

            Text("Pas cette fois")
                .font(.custom("Georgia", size: 26))
                .fontWeight(.bold)
                .foregroundColor(Theme.red)
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 8)

            Text("La bonne réponse était…")
                .font(.system(size: 15))
                .foregroundColor(Theme.textDim)
                .opacity(appeared ? 1 : 0)
        }
        .onAppear {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.6).delay(0.08)) {
                appeared = true
            }
            withAnimation(.easeInOut(duration: 0.07).repeatCount(5, autoreverses: true).delay(0.6)) {
                shake = true
            }
        }
    }
}

// MARK: - Shared result cards

struct FilmResultCard: View {
    let result: ChallengeResult

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            HStack(alignment: .top, spacing: Theme.spacing12) {
                AsyncImage(url: URL(string: result.resolvedImageUrl)) { img in
                    img.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle().fill(Theme.surfaceAlt)
                }
                .frame(width: 80, height: 120)
                .clipped()
                .cornerRadius(Theme.radiusS)

                VStack(alignment: .leading, spacing: 6) {
                    Text(result.title)
                        .font(.custom("Georgia", size: 18))
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.text)

                    if let year = result.year {
                        Text("\(year)")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.textDim)
                    }

                    if let director = result.director ?? result.creator {
                        Label(director, systemImage: "person.fill")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.textDim)
                    }

                    if let genres = result.genres, !genres.isEmpty {
                        FlowTags(tags: genres)
                    }
                }
                Spacer()
            }

            if let synopsis = result.synopsis, !synopsis.isEmpty {
                Text(synopsis)
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textDim)
                    .lineLimit(4)
            }

            if let tmdbId = result.tmdbId {
                let type = result.mediaType == "series" ? "tv" : "movie"
                Link(destination: URL(string: "https://www.themoviedb.org/\(type)/\(tmdbId)")!) {
                    Label("Voir sur TMDB", systemImage: "arrow.up.right.square")
                        .font(.system(size: 13))
                        .foregroundColor(Theme.gold)
                }
            }
        }
        .padding(Theme.spacing16)
        .cardStyle()
    }
}

struct WikiResultCard: View {
    let result: WikiResult

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            HStack(alignment: .top, spacing: Theme.spacing12) {
                if let photoUrl = result.resolvedPhotoUrl {
                    AsyncImage(url: URL(string: photoUrl)) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle().fill(Theme.surfaceAlt)
                    }
                    .frame(width: 80, height: 100)
                    .clipped()
                    .clipShape(Circle())
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(result.name)
                        .font(.custom("Georgia", size: 18))
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.text)

                    Text(personTypeLabel(result.personType))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Theme.gold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Theme.gold.opacity(0.15))
                        .cornerRadius(4)
                }
                Spacer()
            }

            if let bio = result.bio, !bio.isEmpty {
                Text(bio)
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textDim)
                    .lineLimit(4)
            }

            if let wikiUrl = result.wikipediaUrl, let url = URL(string: wikiUrl) {
                Link(destination: url) {
                    Label("Voir sur Wikipedia", systemImage: "arrow.up.right.square")
                        .font(.system(size: 13))
                        .foregroundColor(Theme.gold)
                }
            }
        }
        .padding(Theme.spacing16)
        .cardStyle()
    }

    private func personTypeLabel(_ type: String) -> String {
        switch type {
        case "politician":       return "Personnalité politique"
        case "sportsperson":     return "Sportif·ve"
        case "artist":           return "Artiste"
        case "scientist":        return "Scientifique"
        case "entrepreneur":     return "Entrepreneur·se"
        case "writer":           return "Écrivain·e"
        case "historical_figure":return "Figure historique"
        default:                 return "Personnalité"
        }
    }
}

struct StatsRow: View {
    let attemptsUsed: Int
    let hintsUsed: Int

    var body: some View {
        HStack {
            StatBox(label: "Tentatives", value: "\(attemptsUsed)")
            Divider().frame(height: 30).background(Theme.border)
            StatBox(label: "Indices", value: "\(hintsUsed)")
        }
        .padding(Theme.spacing12)
        .cardStyle()
    }
}

struct StatBox: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(Theme.gold)
            Text(label)
                .font(.system(size: 11))
                .foregroundColor(Theme.textDim)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Share buttons

struct ShareResultButtons: View {
    @ObservedObject var vm: GameViewModel
    @State private var shareImage: ShareableImage? = nil

    var body: some View {
        VStack(spacing: Theme.spacing8) {
            Button {
                shareImage = makeShareImage()
            } label: {
                Label("Partager", systemImage: "square.and.arrow.up")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(PrimaryButtonStyle())
            .sheet(item: $shareImage) { img in
                ShareSheet(image: img.image)
            }

            ShareLink(item: vm.shareText) {
                Label("Partager en texte", systemImage: "doc.text")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SecondaryButtonStyle())
        }
    }

    @MainActor
    private func makeShareImage() -> ShareableImage? {
        let card = ShareResultCard(vm: vm)
            .frame(width: 360)
            .background(Theme.background)
        let renderer = ImageRenderer(content: card)
        renderer.scale = 3.0
        guard let uiImage = renderer.uiImage else { return nil }
        return ShareableImage(image: uiImage)
    }
}

struct ShareableImage: Identifiable, Transferable {
    let id = UUID()
    let image: UIImage

    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .png) { item in
            guard let data = item.image.pngData() else { throw CocoaError(.fileWriteUnknown) }
            return data
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let image: UIImage
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: [image], applicationActivities: nil)
    }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}

// MARK: - Share result card (rendered to image)

struct ShareResultCard: View {
    @ObservedObject var vm: GameViewModel

    private var modeLabel: String {
        switch vm.mode {
        case .film:   return "🎬 Films"
        case .series: return "📺 Séries"
        case .wiki:   return "🧠 Personnalités"
        }
    }

    private var resultTitle: String {
        if let r = vm.filmResult { return r.title }
        if let r = vm.wikiResult { return r.name }
        return "?"
    }

    private var grid: String { vm.shareText.components(separatedBy: "\n").dropFirst().first ?? "" }

    private var scoreLabel: String {
        guard let c = vm.challenge else { return "" }
        return c.won
            ? "Trouvé en \(c.attemptsUsed)/\(c.maxAttempts) 🎉"
            : "Non trouvé (\(c.maxAttempts)/\(c.maxAttempts)) 💀"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Top bar
            HStack {
                ApertureIconView(size: 28, showBackground: true, cornerRadius: 8)
                (
                    Text("Guess").font(.custom("Fraunces", size: 14)).fontWeight(.medium).foregroundColor(Theme.text)
                    + Text("today").font(.custom("Fraunces", size: 14)).italic()
                        .foregroundStyle(LinearGradient(colors: [Color(hex: "#f0c870"), Color(hex: "#8a5e1f")], startPoint: .top, endPoint: .bottom))
                )
                Spacer()
                Text(modeLabel)
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textDim)
            }
            .padding(Theme.spacing16)

            Divider().background(Theme.border)

            // Result
            VStack(spacing: Theme.spacing12) {
                Text(resultTitle)
                    .font(.custom("Georgia", size: 20))
                    .fontWeight(.semibold)
                    .foregroundColor(Theme.text)
                    .multilineTextAlignment(.center)

                Text(grid)
                    .font(.system(size: 22))
                    .tracking(4)

                Text(scoreLabel)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(vm.challenge?.won == true ? Theme.green : Theme.red)
            }
            .padding(Theme.spacing20)

            Divider().background(Theme.border)

            // Footer
            Text("guesstoday.fr")
                .font(.system(size: 11))
                .foregroundColor(Theme.muted)
                .padding(.vertical, Theme.spacing12)
        }
        .background(Theme.background)
        .cornerRadius(Theme.radiusL)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusL).stroke(Theme.border, lineWidth: 1))
        .padding(Theme.spacing16)
    }
}

struct FlowTags: View {
    let tags: [String]

    var body: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 60), alignment: .leading)],
            alignment: .leading,
            spacing: 4
        ) {
            ForEach(tags, id: \.self) { tag in
                Text(tag)
                    .font(.system(size: 11))
                    .foregroundColor(Theme.textDim)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Theme.surfaceAlt)
                    .cornerRadius(4)
            }
        }
    }
}
