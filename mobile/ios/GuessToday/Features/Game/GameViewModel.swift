import Foundation
import SwiftUI

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

@Observable
@MainActor
final class GameViewModel {
    let mode: GameMode

    // Challenge state
    var challenge: ChallengePayload?
    var filmResult: ChallengeResult?
    var wikiResult: WikiResult?

    // UI state
    var isLoading = false
    var error: String?
    var inputText = ""
    var searchResults: [SearchResultItem] = []
    var isSearching = false
    var previousHintsRevealed = 0

    // Game outcome sheet
    var showWinSheet = false
    var showLoseSheet = false

    // Date navigation
    var viewingDate: String?

    // Shake animation trigger
    var shakeAmount: Double = 0

    // Flash feedback color (green = correct, red = wrong)
    var flashColor: Color? = nil

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
        error = nil
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
            error = e.localizedDescription
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

            challenge = response.payload

            if response.correct {
                successHaptic.notificationOccurred(.success)
                triggerFlash(.green)
                await fetchResult(challengeId: response.payload.challengeId)
                showWinSheet = true
                recordStats(won: true, attemptsUsed: response.payload.attemptsUsed)
            } else {
                haptic.impactOccurred()
                triggerShake()
                triggerFlash(.red)
                if response.payload.isGameOver {
                    await fetchResult(challengeId: response.payload.challengeId)
                    showLoseSheet = true
                    recordStats(won: false, attemptsUsed: response.payload.attemptsUsed)
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

            do {
                isSearching = true
                let results = mode == .wiki
                    ? try await APIClient.shared.searchWikiPersons(query: text)
                    : try await APIClient.shared.searchFilms(query: text, type: mode.apiType)
                searchResults = results
            } catch {}
            isSearching = false
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
        guard let c = challenge, c.hasPrevChallenge else { return }
        do {
            if let prevDate = try await APIClient.shared.adjacentDate(date: c.date, direction: "prev", type: mode == .wiki ? "wiki" : mode.apiType) {
                await loadDate(prevDate)
            }
        } catch {}
    }

    func navigateNext() async {
        guard let c = challenge, c.hasNextChallenge, c.isPastChallenge else { return }
        do {
            if let nextDate = try await APIClient.shared.adjacentDate(date: c.date, direction: "next", type: mode == .wiki ? "wiki" : mode.apiType) {
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
        var stats = loadStats()
        stats.gamesPlayed += 1
        if won {
            stats.wins += 1
            stats.currentStreak += 1
            stats.maxStreak = max(stats.maxStreak, stats.currentStreak)
            let key = "\(attemptsUsed)"
            stats.distribution[key, default: 0] += 1
        } else {
            stats.currentStreak = 0
        }
        saveStats(stats)
    }

    func loadStats() -> LocalStats {
        guard let data = UserDefaults.standard.data(forKey: "stats_\(mode.statsKey)"),
              let stats = try? JSONDecoder().decode(LocalStats.self, from: data) else {
            return LocalStats()
        }
        return stats
    }

    private func saveStats(_ stats: LocalStats) {
        guard let data = try? JSONEncoder().encode(stats) else { return }
        UserDefaults.standard.set(data, forKey: "stats_\(mode.statsKey)")
    }

    // MARK: - Private helpers

    private func triggerShake() {
        withAnimation(.default) { shakeAmount += 1 }
    }

    private func triggerFlash(_ color: Color) {
        let opacity: Double = color == .green ? 0.35 : 0.28
        flashColor = color.opacity(opacity)
        Task {
            try? await Task.sleep(for: .milliseconds(500))
            flashColor = nil
        }
    }
}
