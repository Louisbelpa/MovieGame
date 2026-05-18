import Foundation

enum MobileAuthHandoff {
    private static let tokenPattern = try? NSRegularExpression(pattern: "^[0-9a-f]{64}$", options: .caseInsensitive)

    /// `guesstoday://auth?token=<sessionToken>` after web register/login from the app.
    static func parseSessionToken(from url: URL) -> String? {
        guard url.scheme?.lowercased() == "guesstoday",
              url.host?.lowercased() == "auth" else { return nil }

        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let token = components.queryItems?.first(where: { $0.name == "token" })?.value,
              !token.isEmpty else { return nil }

        let range = NSRange(token.startIndex..., in: token)
        guard tokenPattern?.firstMatch(in: token, range: range) != nil else { return nil }
        return token
    }

    static var webRegisterURL: URL {
        URL(string: "\(BuildConfig.baseURL)?auth=register&platform=ios")!
    }
}
