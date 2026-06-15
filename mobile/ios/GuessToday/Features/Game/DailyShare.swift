import SwiftUI

// MARK: - Modèle d'un résultat de jeu du jour (sans spoiler)

struct DailyGameResult {
    let mode: GameMode
    let outcome: String?      // "won" | "lost" | nil (pas joué / en cours)
    let attemptsUsed: Int
    let maxAttempts: Int
    let challengeNumber: Int

    var isWon: Bool { outcome == "won" }
    var isLost: Bool { outcome == "lost" }
    var isPlayed: Bool { outcome != nil }
}

enum DailyShare {
    /// Récupère les 3 résultats du jour (mock-aware), pour partage agrégé.
    static func fetchResults() async -> [DailyGameResult] {
        #if DEBUG || NRT
        if FeatureFlags.shared.useMockData {
            return [GameMode.film, .series, .wiki].map { mode in
                let m = MockData.hubStatus(for: mode)
                return DailyGameResult(mode: mode, outcome: m.outcome, attemptsUsed: m.attemptsUsed, maxAttempts: 5, challengeNumber: m.number)
            }
        }
        #endif
        var out: [DailyGameResult] = []
        for mode in [GameMode.film, .series, .wiki] {
            do {
                let c: ChallengePayload = mode == .wiki
                    ? try await APIClient.shared.todayWikiChallenge()
                    : try await APIClient.shared.todayChallenge(type: mode.apiType)
                out.append(DailyGameResult(mode: mode, outcome: c.outcome, attemptsUsed: c.attemptsUsed, maxAttempts: c.maxAttempts, challengeNumber: c.challengeNumber))
            } catch {
                continue
            }
        }
        return out
    }

    /// Texte Wordle-like sans spoiler.
    static func text(_ results: [DailyGameResult]) -> String {
        let number = results.first?.challengeNumber
        let date = Date().formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "fr_FR")))
        var lines: [String] = []
        lines.append("GuessToday \(number.map { "#\($0)" } ?? "") — \(date)".trimmingCharacters(in: .whitespaces))
        for r in results {
            let emoji = r.mode == .film ? "🎬" : (r.mode == .series ? "📺" : "🧠")
            let score: String
            if r.isWon { score = String(repeating: "🟩", count: r.attemptsUsed) + String(repeating: "⬜", count: max(0, r.maxAttempts - r.attemptsUsed)) + " \(r.attemptsUsed)/\(r.maxAttempts)" }
            else if r.isLost { score = String(repeating: "🟥", count: r.maxAttempts) + " X" }
            else { score = "⬜ pas encore joué" }
            lines.append("\(emoji) \(score)")
        }
        let done = results.filter(\.isWon).count
        lines.append("\(done)/3 réussi\(done > 1 ? "s" : "")")
        lines.append(PublicSite.url)
        return lines.joined(separator: "\n")
    }
}

private enum PublicSite { static let url = "guesstoday.fr" }

// MARK: - Bouton « Partager ma journée »

struct DailyShareButton: View {
    @State private var loading = false
    @State private var sharePayload: DailySharePayload? = nil

    var body: some View {
        Button {
            Task { await prepare() }
        } label: {
            HStack(spacing: 8) {
                if loading { ProgressView().tint(.white) }
                Label("Partager ma journée", systemImage: "square.and.arrow.up")
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(CandyButtonStyle(accent: Theme.coral, accentDark: Theme.coralDark))
        .disabled(loading)
        .sheet(item: $sharePayload) { p in
            ShareItemsSheet(items: [p.image as Any, p.text])
        }
    }

    @MainActor
    private func prepare() async {
        loading = true
        defer { loading = false }
        let results = await DailyShare.fetchResults()
        let text = DailyShare.text(results)
        let card = DailyShareCard(results: results).frame(width: 360).background(Theme.bg)
        let renderer = ImageRenderer(content: card)
        renderer.scale = 3.0
        sharePayload = DailySharePayload(text: text, image: renderer.uiImage)
    }
}

private struct DailySharePayload: Identifiable {
    let id = UUID()
    let text: String
    let image: UIImage?
}

struct ShareItemsSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items.compactMap { ($0 as? UIImage) ?? ($0 as? String) }, applicationActivities: nil)
    }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}

// MARK: - Carte « Ma journée » (rendue en image, sans spoiler)

struct DailyShareCard: View {
    let results: [DailyGameResult]

    private var number: Int? { results.first?.challengeNumber }
    private var done: Int { results.filter(\.isWon).count }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 9, style: .continuous).fill(Theme.coral)
                    .frame(width: 28, height: 28)
                    .overlay(Image(systemName: "sparkles").font(.system(size: 14, weight: .bold)).foregroundColor(.white))
                Text("GuessToday").font(Theme.fraunces(size: 18)).foregroundColor(Theme.ink)
                Spacer()
                if let number { Text("#\(number)").font(Theme.mono(size: 13, weight: .bold)).foregroundColor(Theme.ink2) }
            }

            ForEach(results, id: \.mode.title) { r in
                HStack(spacing: 10) {
                    GameGlyph(mode: r.mode, size: 32)
                    Text(r.mode.title).font(Theme.inter(size: 14, weight: .semibold)).foregroundColor(Theme.ink)
                    Spacer()
                    HStack(spacing: 4) {
                        ForEach(0..<r.maxAttempts, id: \.self) { i in
                            Circle().fill(pip(r, i)).frame(width: 11, height: 11)
                        }
                    }
                    Text(label(r)).font(Theme.mono(size: 12, weight: .bold)).foregroundColor(textColor(r)).frame(width: 34, alignment: .trailing)
                }
            }

            HStack {
                Text("\(done)/3 réussis").font(Theme.fraunces(size: 16)).foregroundColor(Theme.ink)
                Spacer()
                Text("guesstoday.fr").font(Theme.mono(size: 11, weight: .medium)).foregroundColor(Theme.ink3)
            }
        }
        .padding(20)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Theme.panel))
    }

    private func pip(_ r: DailyGameResult, _ i: Int) -> Color {
        guard r.isPlayed else { return Theme.line2 }
        if i >= r.attemptsUsed { return Theme.line2 }
        if r.isWon && i == r.attemptsUsed - 1 { return Theme.correct }
        return r.isWon ? r.mode.color : Theme.wrong
    }
    private func label(_ r: DailyGameResult) -> String {
        if r.isWon { return "\(r.attemptsUsed)/\(r.maxAttempts)" }
        if r.isLost { return "X" }
        return "—"
    }
    private func textColor(_ r: DailyGameResult) -> Color {
        if r.isWon { return Theme.correctDark }
        if r.isLost { return Theme.wrongDark }
        return Theme.ink3
    }
}
