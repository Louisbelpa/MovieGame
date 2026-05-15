import Foundation

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

    /// Import local stats for all modes to server (called once at login).
    func importLocalToServer() async {
        for mode in [GameMode.film, .series, .wiki] {
            let local = loadLocal(mode)
            guard local.gamesPlayed > 0 else { continue }
            try? await APIClient.shared.importStats(local, for: mode)
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
}
