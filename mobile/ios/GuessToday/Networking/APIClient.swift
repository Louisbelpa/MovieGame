import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case httpError(statusCode: Int, message: String)
    case decodingError(Error)
    case networkError(Error)
    case unauthenticated

    var errorDescription: String? {
        switch self {
        case .invalidURL:             return "URL invalide"
        case .httpError(_, let m):    return m
        case .decodingError(let e):   return "Données invalides : \(e.localizedDescription)"
        case .networkError(let e):    return e.localizedDescription
        case .unauthenticated:        return "Connexion requise"
        }
    }
}

final class APIClient {
    static let shared = APIClient()
    private init() {}

    #if DEBUG || NRT
    static var baseURL: String { EnvironmentManager.shared.baseURL }
    #else
    static let baseURL = "https://guesstoday.fr"
    #endif

    // ── Auth token (joueur connecté) ───────────────────────────────────────
    var sessionToken: String? {
        get { KeychainHelper.shared.get(key: "session_token") }
        set {
            if let v = newValue { KeychainHelper.shared.set(key: "session_token", value: v) }
            else { KeychainHelper.shared.delete(key: "session_token") }
        }
    }

    // ── Game session token (session anonyme de jeu) ────────────────────────
    // URLSession ne stocke pas fiablement les cookies de `localhost`.
    // On extrait le token du Set-Cookie à la 1ère réponse et on le renvoi
    // via X-Game-Session sur toutes les requêtes suivantes.
    private var gameSessionToken: String? {
        get { UserDefaults.standard.string(forKey: "game_session_token") }
        set { UserDefaults.standard.set(newValue, forKey: "game_session_token") }
    }

    private func extractGameSessionCookie(from response: HTTPURLResponse) {
        // Le backend envoie Set-Cookie: mg_session=s%3A<token>.<sig>
        // On extrait la valeur brute du cookie pour la stocker nous-mêmes.
        guard let fields = response.allHeaderFields as? [String: String],
              let cookieHeader = fields["Set-Cookie"] else { return }
        // Cherche mg_session=s%3A<uuid>
        let parts = cookieHeader.components(separatedBy: ";")
        for part in parts {
            let kv = part.trimmingCharacters(in: .whitespaces)
            if kv.hasPrefix("mg_session=") {
                var value = String(kv.dropFirst("mg_session=".count))
                // cookie-parser stocke "s:<token>.<sig>" — on a besoin du UUID brut
                // Le header X-Game-Session n'est PAS signé : on envoie un UUID généré
                // localement (créé une seule fois, persisté, envoyé comme token nu).
                _ = value // on n'utilise pas la valeur signée côté client
                return
            }
        }
    }

    /// Retourne le token de session de jeu existant, ou en génère un nouveau.
    private func getOrCreateGameSessionToken() -> String {
        if let t = gameSessionToken, !t.isEmpty { return t }
        let t = UUID().uuidString
        gameSessionToken = t
        return t
    }

    func clearSession() {
        sessionToken = nil
        gameSessionToken = nil
        HTTPCookieStorage.shared.removeCookies(since: Date.distantPast)
    }

    private let urlSession: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpCookieStorage = .shared
        config.httpShouldSetCookies = true
        config.httpCookieAcceptPolicy = .always
        config.timeoutIntervalForRequest = 20
        config.timeoutIntervalForResource = 60
        return URLSession(configuration: config)
    }()

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: Encodable? = nil,
        requiresAuth: Bool = false
    ) async throws -> T {
        guard let url = URL(string: Self.baseURL + path) else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("ios", forHTTPHeaderField: "X-Platform")

        // Token de session de jeu (anonyme) — fallback quand les cookies ne fonctionnent pas
        req.setValue(getOrCreateGameSessionToken(), forHTTPHeaderField: "X-Game-Session")

        if let token = sessionToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else if requiresAuth {
            throw APIError.unauthenticated
        }

        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await urlSession.data(for: req)
        } catch {
            throw APIError.networkError(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        if !(200..<300).contains(http.statusCode) {
            let msg = (try? decoder.decode(APIErrorResponse.self, from: data))?.displayMessage
                ?? HTTPURLResponse.localizedString(forStatusCode: http.statusCode)
            throw APIError.httpError(statusCode: http.statusCode, message: msg)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // Helper for requests that return empty body
    private func requestVoid(_ path: String, method: String = "POST", body: Encodable? = nil) async throws {
        struct Empty: Codable {}
        let _: Empty = try await request(path, method: method, body: body)
    }
}

// MARK: - Challenge Endpoints

extension APIClient {
    func todayChallenge(type: String = "film") async throws -> ChallengePayload {
        try await request("/api/challenge/today?type=\(type)")
    }

    func challengeForDate(_ date: String, type: String = "film") async throws -> ChallengePayload {
        try await request("/api/challenge/date/\(date)?type=\(type)")
    }

    func submitGuess(challengeId: Int, guess: String) async throws -> GuessResponse {
        struct Body: Encodable { let challengeId: Int; let guess: String }
        return try await request("/api/challenge/guess", method: "POST", body: Body(challengeId: challengeId, guess: guess))
    }

    func challengeResult(challengeId: Int) async throws -> ChallengeResult {
        try await request("/api/challenge/result?challengeId=\(challengeId)")
    }

    func searchFilms(query: String, type: String = "film", limit: Int = 8) async throws -> [SearchResultItem] {
        let q = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let path = type == "series"
            ? "/api/series/search?q=\(q)&limit=\(limit)"
            : "/api/films/search?q=\(q)&limit=\(limit)"
        let r: SearchResponse = try await request(path)
        return r.results
    }

    func challengeDates(days: Int = 365, type: String = "film") async throws -> [String] {
        let r: DatesPayload = try await request("/api/challenge/dates?days=\(days)&type=\(type)")
        return r.dates
    }

    func adjacentDate(date: String, direction: String, type: String = "film") async throws -> String? {
        let r: AdjacentDatePayload = try await request("/api/challenge/adjacent?date=\(date)&direction=\(direction)&type=\(type)")
        return r.date
    }
}

// MARK: - Wiki Endpoints

extension APIClient {
    func todayWikiChallenge() async throws -> ChallengePayload {
        try await request("/api/wiki/today")
    }

    func wikiChallengeForDate(_ date: String) async throws -> ChallengePayload {
        try await request("/api/wiki/date/\(date)")
    }

    func submitWikiGuess(challengeId: Int, guess: String) async throws -> GuessResponse {
        struct Body: Encodable { let challengeId: Int; let guess: String }
        return try await request("/api/wiki/guess", method: "POST", body: Body(challengeId: challengeId, guess: guess))
    }

    func wikiResult(challengeId: Int) async throws -> WikiResult {
        try await request("/api/wiki/result?challengeId=\(challengeId)")
    }

    func searchWikiPersons(query: String, limit: Int = 8) async throws -> [SearchResultItem] {
        let q = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let r: SearchResponse = try await request("/api/wiki/search?q=\(q)&limit=\(limit)")
        return r.results
    }

    func wikiDates(days: Int = 365) async throws -> [String] {
        let r: DatesPayload = try await request("/api/wiki/dates?days=\(days)")
        return r.dates
    }

    func wikiAdjacentDate(date: String, direction: String) async throws -> String? {
        let r: AdjacentDatePayload = try await request("/api/wiki/adjacent?date=\(date)&direction=\(direction)")
        return r.date
    }
}

// MARK: - Auth Endpoints

extension APIClient {
    func login(email: String, password: String) async throws -> AuthResponse {
        struct Body: Encodable { let email: String; let password: String }
        let r: AuthResponse = try await request("/api/auth/login", method: "POST", body: Body(email: email, password: password))
        sessionToken = r.sessionToken
        return r
    }

    func register(email: String, password: String, displayName: String) async throws -> AuthResponse {
        struct Body: Encodable { let email: String; let password: String; let displayName: String }
        let r: AuthResponse = try await request("/api/auth/register", method: "POST", body: Body(email: email, password: password, displayName: displayName))
        sessionToken = r.sessionToken
        return r
    }

    func me() async throws -> User? {
        let r: MeResponse = try await request("/api/auth/me")
        return r.user
    }

    func logout() async throws {
        try await requestVoid("/api/auth/logout", method: "POST")
        sessionToken = nil
    }

    func uploadAvatar(imageData: Data) async throws -> User {
        guard let url = URL(string: Self.baseURL + "/api/auth/avatar") else {
            throw APIError.invalidURL
        }
        let boundary = UUID().uuidString
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let token = sessionToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"avatar\"; filename=\"avatar.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body

        let (data, response): (Data, URLResponse)
        do { (data, response) = try await urlSession.data(for: req) }
        catch { throw APIError.networkError(error) }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.networkError(URLError(.badServerResponse))
        }
        if !(200..<300).contains(http.statusCode) {
            let msg = (try? decoder.decode(APIErrorResponse.self, from: data))?.displayMessage
                ?? HTTPURLResponse.localizedString(forStatusCode: http.statusCode)
            throw APIError.httpError(statusCode: http.statusCode, message: msg)
        }
        struct Resp: Decodable { let user: User }
        do { return try decoder.decode(Resp.self, from: data).user }
        catch { throw APIError.decodingError(error) }
    }

    func updateProfile(displayName: String? = nil, avatarUrl: String? = nil) async throws -> User {
        struct Body: Encodable { let displayName: String?; let avatarUrl: String? }
        struct Resp: Codable { let user: User }
        let r: Resp = try await request("/api/auth/profile", method: "PUT", body: Body(displayName: displayName, avatarUrl: avatarUrl), requiresAuth: true)
        return r.user
    }

    func changePassword(current: String, new: String) async throws {
        struct Body: Encodable { let currentPassword: String; let newPassword: String }
        try await requestVoid("/api/auth/change-password", method: "POST", body: Body(currentPassword: current, newPassword: new))
    }

    func forgotPassword(email: String) async throws {
        struct Body: Encodable { let email: String }
        try await requestVoid("/api/auth/forgot-password", method: "POST", body: Body(email: email))
    }

    func appleSignIn(identityToken: String, displayName: String?) async throws -> AuthResponse {
        struct Body: Encodable { let identityToken: String; let displayName: String? }
        let r: AuthResponse = try await request("/api/auth/apple", method: "POST", body: Body(identityToken: identityToken, displayName: displayName))
        sessionToken = r.sessionToken
        return r
    }

    func oauthCallback(provider: String, providerId: String, email: String, displayName: String, avatarUrl: String?) async throws {
        struct Body: Encodable { let provider: String; let providerId: String; let email: String; let displayName: String; let avatarUrl: String? }
        let r: AuthResponse = try await request("/api/auth/oauth/callback", method: "POST", body: Body(provider: provider, providerId: providerId, email: email, displayName: displayName, avatarUrl: avatarUrl))
        sessionToken = r.sessionToken
    }

    func gameHistory(type: String) async throws -> [String: String] {
        struct Resp: Decodable { let history: [String: String] }
        let r: Resp = try await request("/api/auth/history?type=\(type)", requiresAuth: true)
        return r.history
    }

    func deleteAccount() async throws {
        try await requestVoid("/api/auth/account", method: "DELETE")
    }

    func registerPushToken(_ token: String) async throws {
        struct Body: Encodable { let token: String; let platform: String }
        try await requestVoid("/api/auth/push-token", method: "POST", body: Body(token: token, platform: "ios"))
    }

}

// MARK: - Stats Endpoints

extension APIClient {
    func serverStats(type: String) async throws -> ServerStats {
        try await request("/api/auth/stats?type=\(type)", requiresAuth: true)
    }

    func importStats(_ stats: LocalStats, for mode: GameMode) async throws {
        struct Body: Encodable {
            let stats: StatsPayload
            struct StatsPayload: Encodable {
                let gamesPlayed: Int
                let wins: Int
                let currentStreak: Int
                let maxStreak: Int
                let distribution: [String: Int]
            }
        }
        try await requestVoid(
            "/api/auth/import-stats",
            method: "POST",
            body: Body(stats: .init(
                gamesPlayed: stats.gamesPlayed,
                wins: stats.wins,
                currentStreak: stats.currentStreak,
                maxStreak: stats.maxStreak,
                distribution: stats.distribution
            ))
        )
    }

    func importHistory(type: String, history: [String: String]) async throws {
        struct Body: Encodable { let type: String; let history: [String: String] }
        try await requestVoid("/api/auth/import-history", method: "POST", body: Body(type: type, history: history))
    }
}

// MARK: - Friends Endpoints

extension APIClient {
    func friendsLeaderboard() async throws -> LeaderboardPayload {
        try await request("/api/friends/leaderboard", requiresAuth: true)
    }

    func friends(date: String? = nil) async throws -> FriendsPayload {
        var path = "/api/friends"
        if let date { path += "?date=\(date)" }
        return try await request(path, requiresAuth: true)
    }

    func addFriend(code: String) async throws {
        struct Body: Encodable { let code: String }
        try await requestVoid("/api/friends/add", method: "POST", body: Body(code: code))
    }

    func acceptFriend(userId: Int) async throws {
        struct Body: Encodable { let userId: Int }
        try await requestVoid("/api/friends/accept", method: "POST", body: Body(userId: userId))
    }

    func removeFriend(userId: Int) async throws {
        try await requestVoid("/api/friends/\(userId)", method: "DELETE")
    }
}
