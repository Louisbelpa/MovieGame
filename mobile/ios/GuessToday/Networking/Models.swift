import Foundation

// MARK: - Challenge

struct ChallengePayload: Codable {
    let challengeId: Int
    let challengeNumber: Int
    let date: String
    let isPastChallenge: Bool
    let mediaType: String
    let hasPrevChallenge: Bool
    let hasNextChallenge: Bool
    let isGameOver: Bool
    let hintsAvailable: Int
    let hintsRevealed: Int
    let hints: [HintItem]
    let attemptsUsed: Int
    let maxAttempts: Int
    let attempts: [AttemptEntry]
    let outcome: String?

    // Film / series only
    let imageUrl: String?

    // Wiki only
    let personType: String?
    let photoUrl: String?
    let profile: WikiProfile?

    var isWiki: Bool { mediaType == "wiki" }
    var displayImageUrl: String? {
        let raw = isWiki ? photoUrl : imageUrl
        guard let raw else { return nil }
        if raw.hasPrefix("/") { return APIClient.baseURL + raw }
        return raw
    }
    var isFinished: Bool { isGameOver }
    var won: Bool { outcome == "won" }
    var lost: Bool { outcome == "lost" }

    var blurRadius: Double {
        // Wiki seulement : photo masquée jusqu'à la fin de partie (comme WikiChallengeImage sur le web)
        // Films/séries : image nette dès le début (comme MovieImage sur le web)
        guard isWiki && !isGameOver else { return 0 }
        return 40
    }
}

struct HintItem: Codable {
    let type: String
    let value: HintValue

    var displayLabel: String {
        switch type {
        case "year":              return "Année"
        case "director":          return "Réalisateur"
        case "creator":           return "Créateur"
        case "genres":            return "Genres"
        case "cast":              return "Acteur principal"
        case "synopsis":          return "Synopsis"
        case "tagline":           return "Accroche"
        case "wiki_birth_year":   return "Année de naissance"
        case "wiki_nationality":  return "Nationalité"
        case "wiki_party":        return "Parti"
        case "wiki_sport":        return "Sport"
        case "wiki_domain":       return "Domaine"
        case "wiki_notable_work": return "Œuvre notable"
        case "wiki_notable_films": return "Films notables"
        case "wiki_occupation":   return "Profession"
        case "wiki_company":      return "Entreprise"
        case "wiki_name_initials":return "Initiales"
        case "wiki_name_length":  return "Lettres dans le nom"
        case "wiki_position":     return "Poste"
        default:                  return type.replacingOccurrences(of: "wiki_", with: "").capitalized
        }
    }

    var isSynopsis: Bool { type == "synopsis" }
}

enum HintValue: Codable {
    case string(String)
    case strings([String])
    case int(Int)
    case none

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() {
            self = .none
        } else if let s = try? c.decode(String.self) {
            self = .string(s)
        } else if let arr = try? c.decode([String].self) {
            self = .strings(arr)
        } else if let n = try? c.decode(Int.self) {
            self = .int(n)
        } else {
            self = .none
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let s):  try c.encode(s)
        case .strings(let a): try c.encode(a)
        case .int(let n):     try c.encode(n)
        case .none:           try c.encodeNil()
        }
    }

    var displayText: String {
        switch self {
        case .string(let s):  return s
        case .strings(let a): return a.joined(separator: " · ")
        case .int(let n):     return "\(n)"
        case .none:           return ""
        }
    }

    var isEmpty: Bool {
        switch self {
        case .string(let s):  return s.isEmpty
        case .strings(let a): return a.isEmpty
        case .int:            return false
        case .none:           return true
        }
    }
}

struct AttemptEntry: Codable {
    let guess: String
    let correct: Bool
}

struct GuessResponse: Codable {
    let correct: Bool
    let outcome: String?
    let attemptsLeft: Int
    let challenge: ChallengePayload
}

// MARK: - Wiki Profile

struct WikiProfile: Codable {
    let type: String

    // Politician
    let roles: [WikiRole]?

    // Sportsperson
    let clubs: [WikiClub]?
    let clubsYouth: [WikiClub]?
    let sport: String?
    let careerHighlights: [WikiHighlight]?
    let nationalTeam: WikiNationalTeam?

    // Actor
    let notableFilms: String?
    let notableFilmsParts: [String]?
    let occupation: String?

    // Generic / others
    let domain: String?
    let notableWork: String?
    let notableWorkParts: [String]?
    let era: String?
    let company: String?
    let highlights: [WikiHighlight]?
}

struct WikiNationalTeam: Codable {
    let name: String
    let caps: Int?
    let goals: Int?
}

struct WikiRole: Codable {
    let title: String
    let years: String?
    let country: String?
    let predecessor: String?
    let successor: String?
}

struct WikiClub: Codable {
    let name: String
    let years: String?
    let apps: Int?
    let goals: Int?
}

struct WikiHighlight: Codable {
    let label: String
    let value: String
}

// MARK: - Results

struct ChallengeResult: Codable {
    let title: String
    let year: Int?
    let director: String?
    let creator: String?
    let genres: [String]?
    let synopsis: String?
    let imageUrl: String
    let tmdbId: Int?
    let status: String?
    let mediaType: String

    var resolvedImageUrl: String {
        imageUrl.hasPrefix("/") ? APIClient.baseURL + imageUrl : imageUrl
    }
}

struct WikiResult: Codable {
    let name: String
    let personType: String
    let extract: String?   // backend key: extract (bio était incorrect)
    let photoUrl: String?
    let wikipediaUrl: String?

    var resolvedPhotoUrl: String? {
        guard let p = photoUrl else { return nil }
        return p.hasPrefix("/") ? APIClient.baseURL + p : p
    }
}

// MARK: - Auth

struct User: Codable, Equatable {
    let id: Int
    let email: String?
    let displayName: String
    let avatarUrl: String?
    let emailVerified: Bool?
}

struct AuthResponse: Codable {
    let user: User
    let sessionToken: String
}

struct MeResponse: Codable {
    let user: User?
}

// MARK: - Search

struct SearchResponse: Codable {
    let results: [SearchResultItem]
}

struct SearchResultItem: Codable {
    let id: Int?
    let title: String
    let year: Int?
    let personType: String?

    var displayTitle: String {
        if let y = year { return "\(title) (\(y))" }
        return title
    }
}

// MARK: - Server stats

struct ServerStats: Codable {
    let gamesPlayed: Int
    let wins: Int
    let currentStreak: Int
    let maxStreak: Int
    let distribution: [String: Int]

    func toLocalStats() -> LocalStats {
        LocalStats(
            gamesPlayed: gamesPlayed,
            wins: wins,
            currentStreak: currentStreak,
            maxStreak: maxStreak,
            distribution: distribution,
            lastWonDate: nil
        )
    }
}

// MARK: - Stats (local tracking)

struct LocalStats: Codable {
    var gamesPlayed: Int = 0
    var wins: Int = 0
    var currentStreak: Int = 0
    var maxStreak: Int = 0
    var distribution: [String: Int] = [:]
    var lastWonDate: String? = nil  // "yyyy-MM-dd" Paris timezone

    var winRate: Double {
        guard gamesPlayed > 0 else { return 0 }
        return Double(wins) / Double(gamesPlayed)
    }
}

// MARK: - Friends

struct FriendsPayload: Codable {
    let date: String
    let today: String
    let myCode: String?
    let friends: [FriendScoreEntry]
    let pending: [PendingFriendEntry]
}

struct FriendScoreEntry: Codable, Identifiable {
    let id: Int
    let displayName: String
    let streak: Int
    let scores: FriendScores
    let isMe: Bool
}

struct FriendScores: Codable {
    let film: DayScoreEntry?
    let series: DayScoreEntry?
    let wiki: DayScoreEntry?

    func score(for mode: String) -> DayScoreEntry? {
        switch mode {
        case "film":   return film
        case "series": return series
        case "wiki":   return wiki
        default:       return nil
        }
    }
}

struct DayScoreEntry: Codable {
    let attemptsUsed: Int
    let won: Bool
    let completedAt: String
}

struct PendingFriendEntry: Codable, Identifiable {
    let id: Int
    let displayName: String
    let direction: String

    var isIncoming: Bool { direction == "incoming" }
}

struct AddFriendBody: Encodable { let code: String }
struct AcceptFriendBody: Encodable { let userId: Int }

struct LeaderboardEntry: Codable, Identifiable {
    let id: Int
    let displayName: String
    let avatarUrl: String?
    let isMe: Bool
    let rank: Int
    let totalWins: Int
    let totalPlayed: Int
    let winRate: Double
    let filmWins: Int
    let seriesWins: Int
    let wikiWins: Int
    let currentStreak: Int
    let maxStreak: Int
}

struct LeaderboardPayload: Codable {
    let leaderboard: [LeaderboardEntry]
}

// MARK: - Archive

struct DatesPayload: Codable {
    let dates: [String]
}

struct AdjacentDatePayload: Codable {
    let date: String?
}

// MARK: - API Error

struct APIErrorResponse: Codable {
    let error: String?
    let message: String?

    var displayMessage: String {
        let raw = message ?? error ?? ""
        return Self.translate(raw)
    }

    private static func translate(_ raw: String) -> String {
        switch raw.lowercased().trimmingCharacters(in: .whitespaces) {
        case "invalid credentials":
            return "Email ou mot de passe incorrect."
        case "email already registered":
            return "Cette adresse e-mail est déjà utilisée."
        case "invalid email address":
            return "Adresse e-mail invalide."
        case "password must be at least 8 characters":
            return "Le mot de passe doit contenir au moins 8 caractères."
        case "display name is required":
            return "Le nom d'affichage est requis."
        case "email and password are required":
            return "L'e-mail et le mot de passe sont requis."
        case "not authenticated":
            return "Connexion requise."
        case "display name cannot be empty":
            return "Le nom d'affichage ne peut pas être vide."
        case "invalid apple identity token":
            return "Connexion Apple invalide. Réessaie."
        case "account suspended":
            return "Ce compte a été suspendu."
        case "too many requests", "rate limit exceeded":
            return "Trop de tentatives. Réessaie dans quelques minutes."
        case "user not found":
            return "Aucun utilisateur trouvé avec ce code."
        case "friendship already exists or pending":
            return "Tu es déjà ami avec cette personne ou une demande est en attente."
        case "code is required":
            return "Le code ami est requis."
        case "pending friendship not found":
            return "Demande d'amitié introuvable."
        case "cannot add yourself":
            return "Tu ne peux pas t'ajouter toi-même."
        default:
            return raw.isEmpty ? "Une erreur est survenue." : raw
        }
    }
}
