import StoreKit
import UIKit

enum AppStoreReview {
    private static let winsKey = "review_prompt_wins"
    private static let didRequestKey = "review_prompt_did_request"

    /// Call once per victory (today's challenge won).
    @MainActor
    static func recordWin() {
        guard !UserDefaults.standard.bool(forKey: didRequestKey) else { return }

        let wins = UserDefaults.standard.integer(forKey: winsKey) + 1
        UserDefaults.standard.set(wins, forKey: winsKey)

        guard wins >= 3 else { return }

        requestReview()
        UserDefaults.standard.set(true, forKey: didRequestKey)
    }

    @MainActor
    private static func requestReview() {
        guard let scene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first(where: { $0.activationState == .foregroundActive })
            ?? UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first
        else { return }

        AppStore.requestReview(in: scene)
    }
}
