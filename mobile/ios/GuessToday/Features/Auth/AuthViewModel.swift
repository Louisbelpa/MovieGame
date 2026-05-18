import Foundation
import UIKit
import GoogleSignIn

@Observable
@MainActor
final class AuthViewModel {
    var user: User?
    var isCheckingSession = true
    var isLoading = false
    var error: String?

    init() {
        Task { await checkSession() }
    }

    var isLoggedIn: Bool { user != nil }

    func checkSession() async {
        isCheckingSession = true
        do {
            user = try await APIClient.shared.me()
            if user != nil {
                Task { await StatsManager.shared.refreshFromServer() }
            }
        } catch {}
        isCheckingSession = false
    }

    /// Session created on the website after `?platform=ios` register/login — open via `guesstoday://auth?token=…`.
    func completeWebHandoff(sessionToken: String) async {
        APIClient.shared.sessionToken = sessionToken
        isCheckingSession = true
        defer { isCheckingSession = false }
        do {
            user = try await APIClient.shared.me()
            if user != nil {
                await StatsManager.shared.importLocalToServer()
                await StatsManager.shared.refreshFromServer()
            }
        } catch {
            APIClient.shared.sessionToken = nil
            user = nil
        }
    }

    func login(email: String, password: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            let r = try await APIClient.shared.login(email: email, password: password)
            user = r.user
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            Task { await StatsManager.shared.importLocalToServer() }
        } catch let e as APIError {
            error = e.localizedDescription
            UINotificationFeedbackGenerator().notificationOccurred(.error)
            throw e
        }
    }

    func register(email: String, password: String, displayName: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            let r = try await APIClient.shared.register(email: email, password: password, displayName: displayName)
            user = r.user
            Task { await StatsManager.shared.importLocalToServer() }
        } catch let e as APIError {
            error = e.localizedDescription
            throw e
        }
    }

    func logout() async {
        do { try await APIClient.shared.logout() } catch {}
        user = nil
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    func updateProfile(displayName: String? = nil, avatarUrl: String? = nil) async throws {
        let updated = try await APIClient.shared.updateProfile(displayName: displayName, avatarUrl: avatarUrl)
        user = updated
    }

    func changePassword(current: String, new: String) async throws {
        try await APIClient.shared.changePassword(current: current, new: new)
    }

    func deleteAccount() async throws {
        try await APIClient.shared.deleteAccount()
        user = nil
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    func loginWithApple(identityToken: String, displayName: String?) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            let r = try await APIClient.shared.appleSignIn(identityToken: identityToken, displayName: displayName)
            user = r.user
            Task { await StatsManager.shared.importLocalToServer() }
        } catch let e as APIError {
            error = e.localizedDescription
            throw e
        }
    }

    func loginWithGoogle() async throws {
        guard let rootVC = await UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow })?.rootViewController else { return }

        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            // TODO: Set your iOS Google Client ID via GIDSignIn.sharedInstance.configuration before calling signIn
            // e.g. in App init: GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: "YOUR_IOS_CLIENT_ID")
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)
            let gUser = result.user
            guard let userId = gUser.userID,
                  let email = gUser.profile?.email else { return }
            let name = gUser.profile?.name ?? email.components(separatedBy: "@").first ?? "User"
            let avatar = gUser.profile?.imageURL(withDimension: 200)?.absoluteString
            try await APIClient.shared.oauthCallback(provider: "google", providerId: userId, email: email, displayName: name, avatarUrl: avatar)
            user = try await APIClient.shared.me()
            Task { await StatsManager.shared.importLocalToServer() }
        } catch let e as APIError {
            error = e.localizedDescription
            throw e
        }
    }
}
