import Foundation

enum BuildConfig {
    #if NRT
    static let isNRT = true
    static let schemeName = "NRT"
    #elseif DEBUG
    static let isNRT = false
    static let schemeName = "Debug"
    #else
    static let isNRT = false
    static let schemeName = "Release"
    #endif

    static var environment: String {
        #if DEBUG || NRT
        return EnvironmentManager.shared.current.displayName
        #else
        return "Production"
        #endif
    }

    static var baseURL: String {
        #if DEBUG || NRT
        return EnvironmentManager.shared.baseURL
        #else
        return "https://guesstoday.fr"
        #endif
    }
}
