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

    var color: Color {
        switch self {
        case .film:   return Theme.gold
        case .series: return Theme.modeSeries
        case .wiki:   return Theme.modeWiki
        }
    }

    var icon: String {
        switch self {
        case .film:   return "film"
        case .series: return "tv"
        case .wiki:   return "person.bust"
        }
    }

    var iconFilled: String {
        switch self {
        case .film:   return "film.fill"
        case .series: return "tv.fill"
        case .wiki:   return "person.bust.fill"
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
    var previousHintsRevealed = 0

    // Game outcome sheet
    var showWinSheet = false
    var showLoseSheet = false

    // Date navigation
    var viewingDate: String?
    var notFound = false

    // Shake animation trigger
    var shakeAmount: Double = 0

    // Flash feedback color (green = correct, red = wrong)
    var flashColor: Color? = nil

    // Haptic feedback
    @ObservationIgnored private let successHaptic  = UINotificationFeedbackGenerator()
    @ObservationIgnored private let errorHaptic    = UINotificationFeedbackGenerator()
    @ObservationIgnored private let lightImpact    = UIImpactFeedbackGenerator(style: .light)
    @ObservationIgnored private let mediumImpact   = UIImpactFeedbackGenerator(style: .medium)
    @ObservationIgnored private let heavyImpact    = UIImpactFeedbackGenerator(style: .heavy)

    init(mode: GameMode) {
        self.mode = mode
    }

    // MARK: - Load

    func loadToday(isRefresh: Bool = false) async {
        viewingDate = nil
        await fetchChallenge(date: nil, isRefresh: isRefresh)
    }

    func loadDate(_ date: String, isRefresh: Bool = false) async {
        viewingDate = date
        await fetchChallenge(date: date, isRefresh: isRefresh)
    }

    private func fetchChallenge(date: String?, isRefresh: Bool = false) async {
        // On refresh: keep challenge visible, skip loading state, suppress errors silently
        if !isRefresh {
            challenge = nil  // force view remount so stale HintCard @State doesn't linger
            filmResult = nil
            wikiResult = nil
            inputText = ""
            previousHintsRevealed = 0
        }
        isLoading = !isRefresh
        error = nil
        notFound = false

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
                // Sheets shown only from submitGuess to avoid reopening on tab switch / profile navigation
            }
        } catch let e as APIError {
            if case .httpError(let code, _) = e, code == 404 {
                notFound = true
            } else if !isRefresh {
                error = e.localizedDescription
            }
            // On refresh: silent failure — keeps existing challenge visible
        } catch {
            if !isRefresh {
                self.error = error.localizedDescription
            }
            // On refresh: silent failure — network drop/cancellation doesn't wipe the game
        }

        isLoading = false
    }

    // MARK: - Guess

    func submitGuess(_ guess: String) async {
        guard let c = challenge, !c.isGameOver else { return }

        inputText = ""

        do {
            previousHintsRevealed = c.hintsRevealed
            let response = mode == .wiki
                ? try await APIClient.shared.submitWikiGuess(challengeId: c.challengeId, guess: guess)
                : try await APIClient.shared.submitGuess(challengeId: c.challengeId, guess: guess)

            challenge = response.challenge

            if response.correct {
                successHaptic.prepare()
                successHaptic.notificationOccurred(.success)
                SoundManager.shared.playSuccess()
                triggerFlash(.green)
                await fetchResult(challengeId: response.challenge.challengeId)
                heavyImpact.prepare()
                heavyImpact.impactOccurred()
                showWinSheet = true
                recordStats(won: true, attemptsUsed: response.challenge.attemptsUsed)
            } else {
                errorHaptic.prepare()
                errorHaptic.notificationOccurred(.warning)
                SoundManager.shared.playError()
                triggerShake()
                triggerFlash(.red)
                if response.challenge.hintsRevealed > previousHintsRevealed {
                    lightImpact.prepare()
                    lightImpact.impactOccurred()
                }
                if response.challenge.isGameOver {
                    await fetchResult(challengeId: response.challenge.challengeId)
                    SoundManager.shared.playLose()
                    errorHaptic.prepare()
                    errorHaptic.notificationOccurred(.error)
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
        mediumImpact.prepare()
        mediumImpact.impactOccurred()
        await submitGuess("")
    }

    // MARK: - Search

    func onInputChange(_ text: String) {
        inputText = text
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
        guard challenge?.hasPrevChallenge ?? true else { return }
        lightImpact.prepare()
        lightImpact.impactOccurred()
        do {
            let prevDate: String?
            if mode == .wiki {
                prevDate = try await APIClient.shared.wikiAdjacentDate(date: refDate, direction: "prev")
            } else {
                prevDate = try await APIClient.shared.adjacentDate(date: refDate, direction: "prev", type: mode.apiType)
            }
            if let prevDate { await loadDate(prevDate) }
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }

    func navigateNext() async {
        let refDate = challenge?.date ?? viewingDate ?? todayParis()
        let canNext = challenge.map { $0.hasNextChallenge && $0.isPastChallenge } ?? (refDate < todayParis())
        guard canNext else { return }
        lightImpact.prepare()
        lightImpact.impactOccurred()
        do {
            let nextDate: String?
            if mode == .wiki {
                nextDate = try await APIClient.shared.wikiAdjacentDate(date: refDate, direction: "next")
            } else {
                nextDate = try await APIClient.shared.adjacentDate(date: refDate, direction: "next", type: mode.apiType)
            }
            if let nextDate { await loadDate(nextDate) }
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }

    func returnToToday() async {
        lightImpact.prepare()
        lightImpact.impactOccurred()
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
            AppStoreReview.recordWin()
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
        DateFormatter.parisDate.string(from: Date())
    }

    private func yesterdayParis() -> String {
        DateFormatter.parisDate.string(from: Calendar.current.date(byAdding: .day, value: -1, to: Date())!)
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
