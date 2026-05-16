import Foundation
import SwiftUI
import Combine

enum GameMode {
    case film, series, wiki

    var apiType: String {
        switch self {
        case .film:   return "film"
        case .series: return "series"
        case .wiki:   return "wiki"
        }
    }

    var title: String {
        switch self {
        case .film:   return "Films"
        case .series: return "Séries"
        case .wiki:   return "Personnalités"
        }
    }

    var statsKey: String {
        switch self {
        case .film:   return "film"
        case .series: return "series"
        case .wiki:   return "wiki"
        }
    }
}

@MainActor
final class GameViewModel: ObservableObject {
    let mode: GameMode

    // Challenge state
    @Published var challenge: ChallengePayload?
    @Published var filmResult: ChallengeResult?
    @Published var wikiResult: WikiResult?

    // UI state
    @Published var isLoading = false
    @Published var error: String?
    @Published var inputText = ""
    @Published var searchResults: [SearchResultItem] = []
    @Published var isSearching = false
    @Published var previousHintsRevealed = 0

    // Game outcome sheet
    @Published var showWinSheet = false
    @Published var showLoseSheet = false

    // Date navigation
    @Published var viewingDate: String?
    @Published var notFound = false

    // Shake animation trigger
    @Published var shakeAmount: Double = 0

    // Flash feedback color (green = correct, red = wrong)
    @Published var flashColor: Color? = nil

    // Haptic feedback
    private let haptic = UIImpactFeedbackGenerator(style: .medium)
    private let successHaptic = UINotificationFeedbackGenerator()

    private var searchTask: Task<Void, Never>?

    init(mode: GameMode) {
        self.mode = mode
    }

    // MARK: - Load

    func loadToday() async {
        viewingDate = nil
        await fetchChallenge(date: nil)
    }

    func loadDate(_ date: String) async {
        viewingDate = date
        await fetchChallenge(date: date)
    }

    private func fetchChallenge(date: String?) async {
        isLoading = true
        challenge = nil  // force view remount so stale HintCard @State doesn't linger
        error = nil
        notFound = false
        filmResult = nil
        wikiResult = nil
        inputText = ""
        searchResults = []
        previousHintsRevealed = 0

        do {
            let payload: ChallengePayload
            if let date {
                payload = mode == .wiki
                    ? try await APIClient.shared.wikiChallengeForDate(date)
                    : try await APIClient.shared.challengeForDate(date, type: mode.apiType)
            } else {
                payload = mode == .wiki
                    ? try await APIClient.shared.todayWikiChallenge()
                    : try await APIClient.shared.todayChallenge(type: mode.apiType)
            }
            challenge = payload

            if payload.isGameOver {
                await fetchResult(challengeId: payload.challengeId)
                if payload.won {
                    showWinSheet = true
                } else if payload.lost {
                    showLoseSheet = true
                }
            }
        } catch let e as APIError {
            if case .httpError(let code, _) = e, code == 404 {
                notFound = true
            } else {
                error = e.localizedDescription
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Guess

    func submitGuess(_ guess: String) async {
        guard let c = challenge, !c.isGameOver else { return }

        inputText = ""
        searchResults = []

        do {
            previousHintsRevealed = c.hintsRevealed
            let response = mode == .wiki
                ? try await APIClient.shared.submitWikiGuess(challengeId: c.challengeId, guess: guess)
                : try await APIClient.shared.submitGuess(challengeId: c.challengeId, guess: guess)

            challenge = response.challenge

            if response.correct {
                successHaptic.notificationOccurred(.success)
                SoundManager.shared.playSuccess()
                triggerFlash(.green)
                await fetchResult(challengeId: response.challenge.challengeId)
                showWinSheet = true
                recordStats(won: true, attemptsUsed: response.challenge.attemptsUsed)
            } else {
                haptic.impactOccurred()
                SoundManager.shared.playError()
                triggerShake()
                triggerFlash(.red)
                if response.challenge.isGameOver {
                    await fetchResult(challengeId: response.challenge.challengeId)
                    SoundManager.shared.playLose()
                    showLoseSheet = true
                    recordStats(won: false, attemptsUsed: response.challenge.attemptsUsed)
                }
            }
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }

    func skipAttempt() async {
        await submitGuess("")
    }

    // MARK: - Search

    func onInputChange(_ text: String) {
        inputText = text
        searchTask?.cancel()

        guard text.count >= 2 else {
            searchResults = []
            return
        }

        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }

            isSearching = true
            defer { isSearching = false }
            do {
                let results = mode == .wiki
                    ? try await APIClient.shared.searchWikiPersons(query: text)
                    : try await APIClient.shared.searchFilms(query: text, type: mode.apiType)
                guard !Task.isCancelled else { return }
                searchResults = results
            } catch {}
        }
    }

    func selectSearchResult(_ item: SearchResultItem) {
        inputText = item.title
        searchResults = []
    }

    // MARK: - Result

    private func fetchResult(challengeId: Int) async {
        do {
            if mode == .wiki {
                wikiResult = try await APIClient.shared.wikiResult(challengeId: challengeId)
            } else {
                filmResult = try await APIClient.shared.challengeResult(challengeId: challengeId)
            }
        } catch {}
    }

    // MARK: - Navigation

    func navigatePrev() async {
        let refDate = challenge?.date ?? viewingDate ?? todayParis()
        let canPrev = challenge?.hasPrevChallenge ?? true
        guard canPrev else { return }
        do {
            if let prevDate = try await APIClient.shared.adjacentDate(date: refDate, direction: "prev", type: mode == .wiki ? "wiki" : mode.apiType) {
                await loadDate(prevDate)
            }
        } catch {}
    }

    func navigateNext() async {
        let refDate = challenge?.date ?? viewingDate ?? todayParis()
        let canNext = challenge.map { $0.hasNextChallenge && $0.isPastChallenge } ?? (refDate < todayParis())
        guard canNext else { return }
        do {
            if let nextDate = try await APIClient.shared.adjacentDate(date: refDate, direction: "next", type: mode == .wiki ? "wiki" : mode.apiType) {
                await loadDate(nextDate)
            }
        } catch {}
    }

    func returnToToday() async {
        await loadToday()
    }

    // MARK: - Share

    var shareText: String {
        guard let c = challenge else { return "" }

        let title = mode == .wiki ? "WikiGuessr" : "GuessToday"
        let emoji = c.won ? "🎉" : "💀"
        let attempts = c.won ? "\(c.attemptsUsed)/\(c.maxAttempts)" : "X/\(c.maxAttempts)"
        let hints = "(\(c.hintsRevealed) indice\(c.hintsRevealed > 1 ? "s" : ""))"

        var grid = ""
        for attempt in c.attempts {
            if attempt.correct {
                grid += "🟢"
            } else if attempt.guess.isEmpty {
                grid += "⬜"
            } else {
                grid += "🔴"
            }
        }

        return "\(title) \(emoji) \(attempts) \(hints)\n\(grid)\nhttps://guesstoday.fr"
    }

    // MARK: - Stats

    private func recordStats(won: Bool, attemptsUsed: Int) {
        recordHistory(won: won)
        var stats = loadStats()
        stats.gamesPlayed += 1
        let today = todayParis()
        if won {
            stats.wins += 1
            // Streak: consecutive days won (Paris timezone)
            if stats.lastWonDate == today {
                // already counted today (e.g. second game mode) — don't double-increment
            } else if stats.lastWonDate == yesterdayParis() {
                stats.currentStreak += 1
            } else {
                stats.currentStreak = 1
            }
            stats.lastWonDate = today
            stats.maxStreak = max(stats.maxStreak, stats.currentStreak)
            stats.distribution["\(attemptsUsed)", default: 0] += 1
            triggerMilestoneHaptic(for: stats.currentStreak)
        } else {
            // Loss today breaks the streak only if they haven't won today
            if stats.lastWonDate != today {
                stats.currentStreak = 0
            }
        }
        saveStats(stats)
        Task { await StatsManager.shared.refreshFromServer() }
    }

    private func recordHistory(won: Bool) {
        let date = todayParis()
        let key = "history_\(mode.statsKey)"
        var history = (UserDefaults.standard.dictionary(forKey: key) as? [String: String]) ?? [:]
        history[date] = won ? "won" : "lost"
        UserDefaults.standard.set(history, forKey: key)
    }

    private func todayParis() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Europe/Paris")
        return f.string(from: Date())
    }

    private func yesterdayParis() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Europe/Paris")
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        return f.string(from: yesterday)
    }

    private func triggerMilestoneHaptic(for streak: Int) {
        guard streak == 7 || streak == 30 || streak == 100 else { return }
        let gen = UINotificationFeedbackGenerator()
        Task { [weak self] in
            guard self != nil else { return }
            gen.notificationOccurred(.success)
            try? await Task.sleep(for: .milliseconds(180))
            guard self != nil else { return }
            gen.notificationOccurred(.success)
            try? await Task.sleep(for: .milliseconds(180))
            guard self != nil else { return }
            gen.notificationOccurred(.success)
        }
    }

    func loadStats() -> LocalStats {
        StatsManager.shared.stats(for: mode)
    }

    private func saveStats(_ stats: LocalStats) {
        StatsManager.shared.save(stats, for: mode)
    }

    // MARK: - Private helpers

    private func triggerShake() {
        withAnimation(.default) { shakeAmount += 1 }
    }

    private func triggerFlash(_ color: Color) {
        let opacity: Double = color == .green ? 0.35 : 0.28
        flashColor = color.opacity(opacity)
        Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(500))
            self?.flashColor = nil
        }
    }
}
