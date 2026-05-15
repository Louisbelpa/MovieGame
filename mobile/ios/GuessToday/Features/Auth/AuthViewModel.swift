import Foundation

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

    func login(email: String, password: String) async throws {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            let r = try await APIClient.shared.login(email: email, password: password)
            user = r.user
            Task { await StatsManager.shared.importLocalToServer() }
        } catch let e as APIError {
            error = e.localizedDescription
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
    }

    func updateProfile(displayName: String? = nil, avatarUrl: String? = nil) async throws {
        let updated = try await APIClient.shared.updateProfile(displayName: displayName, avatarUrl: avatarUrl)
        user = updated
    }

    func changePassword(current: String, new: String) async throws {
        try await APIClient.shared.changePassword(current: current, new: new)
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
}
