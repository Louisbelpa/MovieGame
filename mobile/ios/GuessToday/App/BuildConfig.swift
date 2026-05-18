import Foundation

enum BuildConfig {
    #if NRT
    static let isNRT = true
    static let environment = "NRT"
    static let baseURL = "https://moviegame-staging.up.railway.app"
    #elseif DEBUG
    static let isNRT = false
    static let environment = "Debug"
    static let baseURL = "http://localhost:3001"
    #else
    static let isNRT = false
    static let environment = "Production"
    static let baseURL = "https://guesstoday.fr"
    #endif
}
