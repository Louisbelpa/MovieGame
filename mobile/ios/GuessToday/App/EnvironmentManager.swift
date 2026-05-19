import Foundation
import Network

enum AppEnvironment: String, CaseIterable, Identifiable {
    case localhost
    case custom       // IP LAN du Mac — pour tester sur device réel
    case staging
    case production

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .localhost:   return "Localhost (simulateur)"
        case .custom:      return "Custom (device réel)"
        case .staging:     return "Staging"
        case .production:  return "Production"
        }
    }

    var defaultBaseURL: String {
        switch self {
        case .localhost:   return "http://localhost:3001"
        case .custom:      return "http://192.168.1.1:3001"   // placeholder
        case .staging:     return "https://moviegame-staging.up.railway.app"
        case .production:  return "https://guesstoday.fr"
        }
    }

    var icon: String {
        switch self {
        case .localhost:   return "laptopcomputer"
        case .custom:      return "network"
        case .staging:     return "server.rack"
        case .production:  return "globe"
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

    private let storageKey    = "debug_selected_environment"
    private let customURLKey  = "debug_custom_base_url"

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

    /// URL base effective (prend en compte l'URL custom si mode .custom)
    var baseURL: String {
        if current == .custom {
            let saved = UserDefaults.standard.string(forKey: customURLKey) ?? ""
            return saved.isEmpty ? current.defaultBaseURL : saved
        }
        return current.defaultBaseURL
    }

    /// URL custom saisie par l'utilisateur (mode .custom uniquement)
    var customBaseURL: String {
        get { UserDefaults.standard.string(forKey: customURLKey) ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: customURLKey) }
    }

    func switchTo(_ environment: AppEnvironment) {
        current = environment
        APIClient.shared.clearSession()
    }

    func resetToDefault() {
        UserDefaults.standard.removeObject(forKey: storageKey)
        APIClient.shared.clearSession()
    }

    // MARK: - Auto-detect Mac LAN IP (utile en simulateur)
    static func detectMacLANIP() -> String? {
        // En simulateur le Mac et le sim partagent la même interface réseau
        var address: String?
        var ifaddr: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifaddr) == 0, let firstAddr = ifaddr else { return nil }
        defer { freeifaddrs(firstAddr) }
        var ptr = firstAddr
        while ptr.pointee.ifa_next != nil {
            let interface = ptr.pointee
            let addrFamily = interface.ifa_addr.pointee.sa_family
            if addrFamily == UInt8(AF_INET) {
                let name = String(cString: interface.ifa_name)
                if name == "en0" {
                    var hostname = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                    getnameinfo(interface.ifa_addr, socklen_t(interface.ifa_addr.pointee.sa_len),
                                &hostname, socklen_t(hostname.count),
                                nil, socklen_t(0), NI_NUMERICHOST)
                    address = String(cString: hostname)
                }
            }
            ptr = ptr.pointee.ifa_next!
        }
        return address
    }
}
