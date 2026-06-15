import SwiftUI
import UserNotifications
import GoogleSignIn

// ─── Deep link router ─────────────────────────────────────────────────────────

@Observable
final class DeepLinkRouter {
    /// Incremented each time a game deep link arrives (triggers onChange in observers).
    private(set) var trigger: Int = 0
    private(set) var pendingMode: GameMode? = nil
    private(set) var pendingDate: String? = nil
    /// Token de réinitialisation reçu via `guesstoday://reset?token=…` — déclenche la feuille ResetPasswordView.
    var pendingResetToken: String? = nil

    /// Handles `guesstoday://game/{film|series|wiki}[/YYYY-MM-DD]`.
    /// Returns true if the URL was consumed.
    func handle(_ url: URL) -> Bool {
        guard url.scheme == "guesstoday", url.host == "game" else { return false }
        let parts = url.pathComponents.filter { $0 != "/" }
        guard let modeStr = parts.first else { return false }
        let mode: GameMode
        switch modeStr {
        case "film":   mode = .film
        case "series": mode = .series
        case "wiki":   mode = .wiki
        default:       return false
        }
        pendingMode = mode
        pendingDate = parts.count > 1 ? parts[1] : nil
        trigger += 1
        return true
    }

    func consume() {
        pendingMode = nil
        pendingDate = nil
    }

    func presentReset(token: String) { pendingResetToken = token }
    func consumeReset() { pendingResetToken = nil }
}

// ─── App ──────────────────────────────────────────────────────────────────────

@main
struct GuessTodayApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var authViewModel = AuthViewModel()
    @State private var router = DeepLinkRouter()

    init() {
        if let clientID = Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authViewModel)
                .environment(router)
                .preferredColorScheme(.light)
                .onOpenURL { url in
                    if router.handle(url) { return }
                    if let resetToken = MobileAuthHandoff.parseResetToken(from: url) {
                        router.presentReset(token: resetToken)
                        return
                    }
                    guard let token = MobileAuthHandoff.parseSessionToken(from: url) else { return }
                    Task { await authViewModel.completeWebHandoff(sessionToken: token) }
                }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    // Universal Links (https) — onOpenURL ne se déclenche pas pour eux.
                    guard let url = activity.webpageURL else { return }
                    if let resetToken = MobileAuthHandoff.parseResetToken(from: url) {
                        router.presentReset(token: resetToken)
                    }
                }
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    // Called after registration succeeds
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task {
            try? await APIClient.shared.registerPushToken(token)
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Push notifications unavailable (simulator, etc.) — ignore silently
    }

    // Show notification even in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
}
