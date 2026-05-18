import Foundation

extension DateFormatter {
    static let parisDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "Europe/Paris")
        f.locale = Locale(identifier: "en_CA")
        return f
    }()
}

/// Shared reactive store for game stats.
/// - When logged in: stats come from the server (source of truth).
/// - When logged out: stats come from UserDefaults (local fallback).
/// Any SwiftUI view reading these properties auto-rerenders on change.
@Observable
@MainActor
final class StatsManager {
    static let shared = StatsManager()

    private(set) var filmStats:   LocalStats = LocalStats()
    private(set) var seriesStats: LocalStats = LocalStats()
    private(set) var wikiStats:   LocalStats = LocalStats()

    private init() { reload() }

    func stats(for mode: GameMode) -> LocalStats {
        switch mode {
        case .film:   return filmStats
        case .series: return seriesStats
        case .wiki:   return wikiStats
        }
    }

    // MARK: - Local write (used when not logged in)

    func save(_ stats: LocalStats, for mode: GameMode) {
        guard let data = try? JSONEncoder().encode(stats) else { return }
        UserDefaults.standard.set(data, forKey: "stats_\(mode.statsKey)")
        apply(stats, for: mode)
    }

    func reload() {
        filmStats   = loadLocal(.film)
        seriesStats = loadLocal(.series)
        wikiStats   = loadLocal(.wiki)
    }

    // MARK: - Server sync

    /// Fetch all three modes from server and update observable state.
    /// Silently ignores 401 (not logged in) and network errors.
    func refreshFromServer() async {
        async let film   = fetchOne("film")
        async let series = fetchOne("series")
        async let wiki   = fetchOne("wiki")
        if let f = await film   { filmStats   = f.toLocalStats() }
        if let s = await series { seriesStats = s.toLocalStats() }
        if let w = await wiki   { wikiStats   = w.toLocalStats() }
    }

    /// Import local stats and history for all modes to server (called once at login).
    func importLocalToServer() async {
        for mode in [GameMode.film, .series, .wiki] {
            let local = loadLocal(mode)
            if local.gamesPlayed > 0 {
                try? await APIClient.shared.importStats(local, for: mode)
            }
            let history = loadLocalHistory(mode)
            if !history.isEmpty {
                try? await APIClient.shared.importHistory(type: mode.statsKey, history: history)
            }
        }
        await refreshFromServer()
    }

    // MARK: - Private

    private func fetchOne(_ type: String) async -> ServerStats? {
        try? await APIClient.shared.serverStats(type: type)
    }

    private func apply(_ stats: LocalStats, for mode: GameMode) {
        switch mode {
        case .film:   filmStats   = stats
        case .series: seriesStats = stats
        case .wiki:   wikiStats   = stats
        }
    }

    private func loadLocal(_ mode: GameMode) -> LocalStats {
        guard let data = UserDefaults.standard.data(forKey: "stats_\(mode.statsKey)"),
              let s = try? JSONDecoder().decode(LocalStats.self, from: data) else {
            return LocalStats()
        }
        return s
    }

    private func loadLocalHistory(_ mode: GameMode) -> [String: String] {
        UserDefaults.standard.dictionary(forKey: "history_\(mode.statsKey)") as? [String: String] ?? [:]
    }
}
