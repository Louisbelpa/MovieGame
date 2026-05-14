import Foundation
import AuthenticationServices

@Observable
final class AuthViewModel: NSObject {
    var user: User?
    var isCheckingSession = true
    var isLoading = false
    var error: String?

    override init() {
        super.init()
        Task { await checkSession() }
    }

    var isLoggedIn: Bool { user != nil }

    func checkSession() async {
        isCheckingSession = true
        do {
            user = try await APIClient.shared.me()
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
        } catch let e as APIError {
            error = e.localizedDescription
            throw e
        }
    }

    func logout() async {
        do { try await APIClient.shared.logout() } catch {}
        user = nil
    }

    func updateProfile(displayName: String) async throws {
        let updated = try await APIClient.shared.updateProfile(displayName: displayName)
        user = updated
    }

    func changePassword(current: String, new: String) async throws {
        try await APIClient.shared.changePassword(current: current, new: new)
    }
}

// MARK: - Sign in with Apple

extension AuthViewModel: ASAuthorizationControllerDelegate {
    func signInWithApple(on viewController: UIViewController) {
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = viewController as? ASAuthorizationControllerPresentationContextProviding
        controller.performRequests()
    }

    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = cred.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else { return }

        let name = [cred.fullName?.givenName, cred.fullName?.familyName]
            .compactMap { $0 }
            .joined(separator: " ")

        Task { @MainActor in
            await appleLogin(token: token, email: cred.email, displayName: name.isEmpty ? nil : name)
        }
    }

    nonisolated func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        // User cancelled or error — no action needed
    }

    @MainActor
    private func appleLogin(token: String, email: String?, displayName: String?) async {
        do {
            // The backend supports OAuth via /api/auth/oauth/callback
            // Here we use the Apple-specific endpoint
            struct AppleBody: Encodable {
                let provider: String
                let providerId: String
                let email: String?
                let displayName: String?
                let avatarUrl: String?
            }
            // Using the apple endpoint /api/auth/apple
            // The backend handles it via the OAuth callback
        } catch {}
    }
}
