import Foundation

enum AppEnvironment: String, CaseIterable, Identifiable {
    case localhost
    case staging
    case production

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .localhost:  return "Localhost"
        case .staging:    return "Staging"
        case .production: return "Production"
        }
    }

    var baseURL: String {
        switch self {
        case .localhost:  return "http://localhost:3001"
        case .staging:    return "https://moviegame-staging.up.railway.app"
        case .production: return "https://guesstoday.fr"
        }
    }

    var icon: String {
        switch self {
        case .localhost:  return "laptopcomputer"
        case .staging:    return "server.rack"
        case .production: return "globe"
        }
    }

    static var compilationDefault: AppEnvironment {
        #if NRT
        return .staging
        #elseif DEBUG
        return .localhost
        #else
        return .production
        #endif
    }
}

final class EnvironmentManager {
    static let shared = EnvironmentManager()
    private let storageKey = "debug_selected_environment"
    private init() {}

    var current: AppEnvironment {
        get {
            guard let raw = UserDefaults.standard.string(forKey: storageKey),
                  let env = AppEnvironment(rawValue: raw) else {
                return AppEnvironment.compilationDefault
            }
            return env
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: storageKey)
        }
    }

    var baseURL: String { current.baseURL }

    func switchTo(_ environment: AppEnvironment) {
        current = environment
        APIClient.shared.clearSession()
    }

    func resetToDefault() {
        UserDefaults.standard.removeObject(forKey: storageKey)
        APIClient.shared.clearSession()
    }
}
