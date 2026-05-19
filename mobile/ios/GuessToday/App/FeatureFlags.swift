#if DEBUG || NRT
import Foundation

/// Feature flags toggleables depuis le Debug Menu.
/// Persistés dans UserDefaults — survivent aux relances de l'app.
final class FeatureFlags: ObservableObject {
    static let shared = FeatureFlags()
    private init() {}

    private let defaults = UserDefaults.standard

    // MARK: - Flags

    /// Remplace tous les appels réseau amis/classement par des données fictives.
    var useMockData: Bool {
        get { defaults.bool(forKey: "ff_use_mock_data") }
        set { defaults.set(newValue, forKey: "ff_use_mock_data") }
    }
}
#endif
