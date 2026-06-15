#if DEBUG || NRT
import Foundation

enum MockData {

    // MARK: - Friends

    static let friendsPayload = FriendsPayload(
        date: todayString(),
        today: todayString(),
        myCode: "LOUIS7",
        friends: [
            FriendScoreEntry(
                id: 1, displayName: "Moi", streak: 12,
                scores: FriendScores(
                    film: DayScoreEntry(attemptsUsed: 2, won: true, completedAt: iso()),
                    series: nil,
                    wiki: DayScoreEntry(attemptsUsed: 4, won: false, completedAt: iso())
                ),
                isMe: true
            ),
            FriendScoreEntry(
                id: 2, displayName: "Alice M.", streak: 7,
                scores: FriendScores(
                    film: DayScoreEntry(attemptsUsed: 1, won: true, completedAt: iso()),
                    series: DayScoreEntry(attemptsUsed: 3, won: true, completedAt: iso()),
                    wiki: nil
                ),
                isMe: false
            ),
            FriendScoreEntry(
                id: 3, displayName: "Thomas B.", streak: 3,
                scores: FriendScores(
                    film: DayScoreEntry(attemptsUsed: 5, won: false, completedAt: iso()),
                    series: nil,
                    wiki: DayScoreEntry(attemptsUsed: 2, won: true, completedAt: iso())
                ),
                isMe: false
            ),
            FriendScoreEntry(
                id: 4, displayName: "Camille R.", streak: 21,
                scores: FriendScores(
                    film: DayScoreEntry(attemptsUsed: 1, won: true, completedAt: iso()),
                    series: DayScoreEntry(attemptsUsed: 1, won: true, completedAt: iso()),
                    wiki: DayScoreEntry(attemptsUsed: 3, won: true, completedAt: iso())
                ),
                isMe: false
            ),
            FriendScoreEntry(
                id: 5, displayName: "Jules D.", streak: 0,
                scores: FriendScores(film: nil, series: nil, wiki: nil),
                isMe: false
            ),
        ],
        pending: [
            PendingFriendEntry(id: 6, displayName: "Sophie L.", direction: "incoming"),
        ]
    )

    // MARK: - Leaderboard

    static let leaderboardPayload = LeaderboardPayload(leaderboard: [
        LeaderboardEntry(id: 4, displayName: "Camille R.", avatarUrl: nil, isMe: false,
                         rank: 1, totalWins: 87, totalPlayed: 90, winRate: 0.97,
                         filmWins: 32, seriesWins: 28, wikiWins: 27,
                         currentStreak: 21, maxStreak: 35),
        LeaderboardEntry(id: 2, displayName: "Alice M.", avatarUrl: nil, isMe: false,
                         rank: 2, totalWins: 64, totalPlayed: 72, winRate: 0.89,
                         filmWins: 28, seriesWins: 20, wikiWins: 16,
                         currentStreak: 7, maxStreak: 14),
        LeaderboardEntry(id: 1, displayName: "Moi", avatarUrl: nil, isMe: true,
                         rank: 3, totalWins: 55, totalPlayed: 65, winRate: 0.85,
                         filmWins: 24, seriesWins: 18, wikiWins: 13,
                         currentStreak: 12, maxStreak: 18),
        LeaderboardEntry(id: 3, displayName: "Thomas B.", avatarUrl: nil, isMe: false,
                         rank: 4, totalWins: 38, totalPlayed: 50, winRate: 0.76,
                         filmWins: 18, seriesWins: 10, wikiWins: 10,
                         currentStreak: 3, maxStreak: 9),
        LeaderboardEntry(id: 5, displayName: "Jules D.", avatarUrl: nil, isMe: false,
                         rank: 5, totalWins: 12, totalPlayed: 20, winRate: 0.60,
                         filmWins: 7, seriesWins: 3, wikiWins: 2,
                         currentStreak: 0, maxStreak: 4),
    ])

    // MARK: - Stats (par jeu)

    static func localStats(for mode: GameMode) -> LocalStats {
        switch mode {
        case .film:
            return LocalStats(gamesPlayed: 65, wins: 55, currentStreak: 12, maxStreak: 18,
                              distribution: ["1": 8, "2": 14, "3": 17, "4": 10, "5": 6, "X": 10], lastWonDate: todayString())
        case .series:
            return LocalStats(gamesPlayed: 48, wins: 38, currentStreak: 5, maxStreak: 14,
                              distribution: ["1": 5, "2": 9, "3": 12, "4": 8, "5": 4, "X": 10], lastWonDate: todayString())
        case .wiki:
            return LocalStats(gamesPlayed: 52, wins: 31, currentStreak: 3, maxStreak: 9,
                              distribution: ["1": 3, "2": 6, "3": 9, "4": 7, "5": 6, "X": 21], lastWonDate: nil)
        }
    }

    // MARK: - Hub (statut du jour par jeu : gagné / en cours / à jouer)

    /// (challengeNumber, outcome, attemptsUsed) pour construire un DailyChallengeStatus fictif.
    static func hubStatus(for mode: GameMode) -> (number: Int, outcome: String?, attemptsUsed: Int) {
        switch mode {
        case .film:   return (142, "won", 2)   // gagné en 2
        case .series: return (138, nil, 1)     // en cours
        case .wiki:   return (96, nil, 0)      // à jouer
        }
    }

    // MARK: - Community stats (Stats du jour)

    static func communityStats(for mode: GameMode) -> CommunityStats {
        switch mode {
        case .film:   return CommunityStats(totalGames: 1240, totalWins: 892, totalLosses: 348, winRate: 72,
                                            winsByAttempt: ["1": 110, "2": 240, "3": 290, "4": 160, "5": 92])
        case .series: return CommunityStats(totalGames: 980, totalWins: 640, totalLosses: 340, winRate: 65,
                                            winsByAttempt: ["1": 70, "2": 150, "3": 210, "4": 130, "5": 80])
        case .wiki:   return CommunityStats(totalGames: 1105, totalWins: 530, totalLosses: 575, winRate: 48,
                                            winsByAttempt: ["1": 40, "2": 95, "3": 140, "4": 130, "5": 125])
        }
    }

    // MARK: - Helpers

    private static func todayString() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    private static func iso() -> String {
        ISO8601DateFormatter().string(from: Date())
    }
}
#endif
