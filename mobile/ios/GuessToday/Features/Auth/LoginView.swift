import SwiftUI
import AuthenticationServices
import GoogleSignIn

struct LoginView: View {
    @Environment(AuthViewModel.self) var auth
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var showRegister = false
    @State private var showForgotPassword = false
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.spacing24) {
                        // Logo / title
                        VStack(spacing: Theme.spacing8) {
                            HStack(spacing: 10) {
                                ApertureIconView(size: 30)
                                (
                                    Text("Guess")
                                        .font(Theme.fraunces(size: 28)).foregroundColor(Theme.text)
                                    + Text("today")
                                        .font(Theme.fraunces(size: 28, italic: true))
                                        .foregroundStyle(LinearGradient(colors: [Color(hex: "#f0c870"), Color(hex: "#8a5e1f")], startPoint: .top, endPoint: .bottom))
                                )
                            }
                            Text("Connectez-vous pour sauvegarder vos stats")
                                .font(.system(size: 14))
                                .foregroundColor(Theme.textDim)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, Theme.spacing24)

                        // Form
                        VStack(spacing: Theme.spacing12) {
                            AuthTextField(placeholder: "Email", text: $email, contentType: .emailAddress, keyboardType: .emailAddress)
                            AuthTextField(placeholder: "Mot de passe", text: $password, contentType: .password, isSecure: true)
                        }
                        .padding(.horizontal, Theme.spacing16)

                        if let error {
                            Text(error)
                                .font(.system(size: 13))
                                .foregroundColor(Theme.red)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        VStack(spacing: Theme.spacing8) {
                            Button("Se connecter") {
                                Task { await login() }
                            }
                            .buttonStyle(PrimaryButtonStyle(isLoading: isLoading))
                            .disabled(isLoading || email.isEmpty || password.isEmpty)
                            .padding(.horizontal, Theme.spacing16)

                            Button("Mot de passe oublié ?") {
                                showForgotPassword = true
                            }
                            .font(.system(size: 13))
                            .foregroundColor(Theme.textDim)
                        }

                        // Google Sign In
                        Button {
                            Task { await loginWithGoogle() }
                        } label: {
                            HStack(spacing: 10) {
                                GoogleLogoMark()
                                Text("Continuer avec Google")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Color(hex: "#1f1f1f"))
                                    .tracking(0.25)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 40)
                            .background(Color.white)
                            .cornerRadius(4)
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(Color(hex: "#747775"), lineWidth: 1)
                            )
                        }
                        .padding(.horizontal, Theme.spacing16)

                        // Apple Sign In
                        SignInWithAppleButton(.signIn) { request in
                            request.requestedScopes = [.fullName, .email]
                        } onCompletion: { result in
                            guard case .success(let authorization) = result,
                                  let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
                                  let tokenData = cred.identityToken,
                                  let token = String(data: tokenData, encoding: .utf8) else { return }
                            let name = [cred.fullName?.givenName, cred.fullName?.familyName]
                                .compactMap { $0 }.joined(separator: " ")
                            Task { await loginWithApple(token: token, name: name.isEmpty ? nil : name) }
                        }
                        .signInWithAppleButtonStyle(.white)
                        .frame(height: 50)
                        .cornerRadius(Theme.radiusM)
                        .padding(.horizontal, Theme.spacing16)

                        HStack {
                            VStack { Divider().background(Theme.border) }
                            Text("ou")
                                .font(.system(size: 12))
                                .foregroundColor(Theme.muted)
                                .fixedSize()
                            VStack { Divider().background(Theme.border) }
                        }
                        .padding(.horizontal, Theme.spacing16)

                        Button("Créer un compte") {
                            showRegister = true
                        }
                        .buttonStyle(SecondaryButtonStyle())
                        .padding(.horizontal, Theme.spacing16)

                        Spacer(minLength: Theme.spacing24)
                    }
                }
            }
            .navigationTitle("Connexion")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }
                        .foregroundColor(Theme.textDim)
                }
            }
            .navigationDestination(isPresented: $showRegister) {
                RegisterView()
            }
            .sheet(isPresented: $showForgotPassword) {
                ForgotPasswordView()
            }
            .onChange(of: auth.isLoggedIn) { _, isLoggedIn in
                if isLoggedIn { dismiss() }
            }
        }
    }

    private func loginWithGoogle() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            try await auth.loginWithGoogle()
            dismiss()
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func loginWithApple(token: String, name: String?) async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            try await auth.loginWithApple(identityToken: token, displayName: name)
            dismiss()
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func login() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            try await auth.login(email: email.lowercased(), password: password)
            dismiss()
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct RegisterView: View {
    @Environment(AuthViewModel.self) var auth
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: Theme.spacing24) {
                    VStack(spacing: Theme.spacing8) {
                        Text("Créer un compte")
                            .font(Theme.fraunces(size: 24))
                            .fontWeight(.bold)
                            .foregroundColor(Theme.text)
                        Text("Sauvegardez vos stats et défiez vos amis")
                            .font(.system(size: 14))
                            .foregroundColor(Theme.textDim)
                    }
                    .padding(.top, Theme.spacing24)

                    WebDataTransferNotice()
                        .padding(.horizontal, Theme.spacing16)

                    VStack(spacing: Theme.spacing12) {
                        AuthTextField(placeholder: "Pseudo", text: $displayName, contentType: .name)
                        AuthTextField(placeholder: "Email", text: $email, contentType: .emailAddress, keyboardType: .emailAddress)
                        AuthTextField(placeholder: "Mot de passe", text: $password, contentType: .newPassword, isSecure: true)
                    }
                    .padding(.horizontal, Theme.spacing16)

                    if let error {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundColor(Theme.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Theme.spacing16)
                    }

                    Button("Créer mon compte") {
                        Task { await register() }
                    }
                    .buttonStyle(PrimaryButtonStyle(isLoading: isLoading))
                    .disabled(isLoading || email.isEmpty || password.isEmpty || displayName.isEmpty)
                    .padding(.horizontal, Theme.spacing16)

                    Spacer(minLength: Theme.spacing24)
                }
            }
        }
        .navigationTitle("Inscription")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private func register() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            try await auth.register(email: email.lowercased(), password: password, displayName: displayName.trimmingCharacters(in: .whitespaces))
            dismiss()
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var email = ""
    @State private var isLoading = false
    @State private var sent = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                VStack(spacing: Theme.spacing20) {
                    if sent {
                        VStack(spacing: Theme.spacing12) {
                            Image(systemName: "envelope.badge.checkmark")
                                .font(.system(size: 48))
                                .foregroundColor(Theme.green)
                            Text("Email envoyé !")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(Theme.text)
                            Text("Vérifiez votre boîte mail pour réinitialiser votre mot de passe.")
                                .font(.system(size: 14))
                                .foregroundColor(Theme.textDim)
                                .multilineTextAlignment(.center)
                            Button("Fermer") { dismiss() }
                                .buttonStyle(PrimaryButtonStyle())
                                .padding(.horizontal, Theme.spacing16)
                        }
                        .padding()
                    } else {
                        VStack(spacing: Theme.spacing16) {
                            Text("Saisissez votre email et nous vous enverrons un lien de réinitialisation.")
                                .font(.system(size: 14))
                                .foregroundColor(Theme.textDim)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, Theme.spacing16)

                            AuthTextField(placeholder: "Email", text: $email, contentType: .emailAddress, keyboardType: .emailAddress)
                                .padding(.horizontal, Theme.spacing16)

                            if let error {
                                Text(error).font(.system(size: 13)).foregroundColor(Theme.red)
                            }

                            Button("Envoyer le lien") {
                                Task { await send() }
                            }
                            .buttonStyle(PrimaryButtonStyle(isLoading: isLoading))
                            .disabled(isLoading || email.isEmpty)
                            .padding(.horizontal, Theme.spacing16)
                        }
                        .padding(.top, Theme.spacing24)
                    }
                    Spacer()
                }
            }
            .navigationTitle("Mot de passe oublié")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Annuler") { dismiss() }.foregroundColor(Theme.textDim)
                }
            }
        }
    }

    private func send() async {
        isLoading = true
        error = nil
        defer { isLoading = false }
        do {
            try await APIClient.shared.forgotPassword(email: email.lowercased())
            sent = true
        } catch let e as APIError {
            error = e.localizedDescription
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// MARK: - Web data transfer notice

struct WebDataTransferNotice: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.amber)
                Text("Vous avez joué sur guesstoday.fr ?")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Theme.amber)
            }

            (
                Text("Vos statistiques sont sauvegardées dans le navigateur. Pour ne pas les perdre, ")
                + Text("créez d'abord votre compte sur le site")
                    .fontWeight(.semibold)
                + Text(" — vos données seront automatiquement transférées. Revenez ensuite vous connecter ici.")
            )
            .font(.system(size: 13))
            .foregroundColor(Theme.text.opacity(0.85))
            .lineSpacing(3)

            Link(destination: MobileAuthHandoff.webRegisterURL) {
                HStack(spacing: 5) {
                    Text("Aller sur guesstoday.fr")
                        .font(.system(size: 13, weight: .semibold))
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 11, weight: .semibold))
                }
                .foregroundColor(Theme.gold)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Theme.spacing16)
        .background(Theme.amber.opacity(0.07))
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(Theme.amber.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Shared text field

struct AuthTextField: View {
    let placeholder: String
    @Binding var text: String
    var contentType: UITextContentType? = nil
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false

    var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
                    .textContentType(contentType)
            } else {
                TextField(placeholder, text: $text)
                    .textContentType(contentType)
                    .keyboardType(keyboardType)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
            }
        }
        .padding(Theme.spacing12)
        .font(.system(size: 15))
        .foregroundColor(Theme.text)
        .tint(Theme.gold)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(Theme.border, lineWidth: 1)
        )
    }
}

// MARK: - Google "G" logo mark (official SVG paths)

private struct GoogleLogoMark: View {
    var size: CGFloat = 20

    var body: some View {
        // Official Google SVG (48×48 viewBox) scaled to `size`
        Canvas { ctx, sz in
            let scale = sz.width / 48.0
            ctx.scaleBy(x: scale, y: scale)

            // Red — top arc
            var red = Path()
            red.move(to: CGPoint(x: 24, y: 9.5))
            red.addCurve(to: CGPoint(x: 33.21, y: 13.1),
                         control1: CGPoint(x: 27.54, y: 9.5),
                         control2: CGPoint(x: 30.71, y: 10.72))
            red.addLine(to: CGPoint(x: 40.06, y: 6.25))
            red.addCurve(to: CGPoint(x: 24, y: 0),
                         control1: CGPoint(x: 35.9, y: 2.38),
                         control2: CGPoint(x: 30.47, y: 0))
            red.addCurve(to: CGPoint(x: 2.56, y: 13.22),
                         control1: CGPoint(x: 14.62, y: 0),
                         control2: CGPoint(x: 6.51, y: 5.38))
            red.addLine(to: CGPoint(x: 10.54, y: 19.41))
            red.addCurve(to: CGPoint(x: 24, y: 9.5),
                         control1: CGPoint(x: 12.43, y: 13.72),
                         control2: CGPoint(x: 17.74, y: 9.5))
            ctx.fill(red, with: .color(Color(hex: "#EA4335")))

            // Blue — right arc + crossbar
            var blue = Path()
            blue.move(to: CGPoint(x: 46.98, y: 24.55))
            blue.addCurve(to: CGPoint(x: 46.6, y: 20),
                          control1: CGPoint(x: 46.98, y: 22.98),
                          control2: CGPoint(x: 46.83, y: 21.46))
            blue.addLine(to: CGPoint(x: 24, y: 20))
            blue.addLine(to: CGPoint(x: 24, y: 29.02))
            blue.addLine(to: CGPoint(x: 36.94, y: 29.02))
            blue.addCurve(to: CGPoint(x: 32.16, y: 36.2),
                          control1: CGPoint(x: 36.36, y: 31.98),
                          control2: CGPoint(x: 34.68, y: 34.5))
            blue.addLine(to: CGPoint(x: 39.89, y: 42.2))
            blue.addCurve(to: CGPoint(x: 46.98, y: 24.55),
                          control1: CGPoint(x: 44.4, y: 38.02),
                          control2: CGPoint(x: 46.98, y: 31.84))
            ctx.fill(blue, with: .color(Color(hex: "#4285F4")))

            // Yellow — left arc
            var yellow = Path()
            yellow.move(to: CGPoint(x: 10.53, y: 28.59))
            yellow.addCurve(to: CGPoint(x: 9.77, y: 24),
                            control1: CGPoint(x: 10.05, y: 27.14),
                            control2: CGPoint(x: 9.77, y: 25.6))
            yellow.addCurve(to: CGPoint(x: 10.53, y: 19.41),
                            control1: CGPoint(x: 9.77, y: 22.4),
                            control2: CGPoint(x: 10.05, y: 20.86))
            yellow.addLine(to: CGPoint(x: 2.56, y: 13.22))
            yellow.addCurve(to: CGPoint(x: 0, y: 24),
                            control1: CGPoint(x: 0.92, y: 16.46),
                            control2: CGPoint(x: 0, y: 20.12))
            yellow.addCurve(to: CGPoint(x: 2.56, y: 34.78),
                            control1: CGPoint(x: 0, y: 27.88),
                            control2: CGPoint(x: 0.92, y: 31.54))
            yellow.addLine(to: CGPoint(x: 10.53, y: 28.59))
            ctx.fill(yellow, with: .color(Color(hex: "#FBBC05")))

            // Green — bottom arc
            var green = Path()
            green.move(to: CGPoint(x: 24, y: 48))
            green.addCurve(to: CGPoint(x: 39.89, y: 42.19),
                           control1: CGPoint(x: 30.48, y: 48),
                           control2: CGPoint(x: 35.93, y: 45.87))
            green.addLine(to: CGPoint(x: 32.16, y: 36.19))
            green.addCurve(to: CGPoint(x: 24, y: 38.49),
                           control1: CGPoint(x: 30.01, y: 37.64),
                           control2: CGPoint(x: 27.24, y: 38.49))
            green.addCurve(to: CGPoint(x: 10.53, y: 28.58),
                           control1: CGPoint(x: 17.74, y: 38.49),
                           control2: CGPoint(x: 12.43, y: 34.27))
            green.addLine(to: CGPoint(x: 2.56, y: 34.77))
            green.addCurve(to: CGPoint(x: 24, y: 48),
                           control1: CGPoint(x: 6.51, y: 42.62),
                           control2: CGPoint(x: 14.62, y: 48))
            ctx.fill(green, with: .color(Color(hex: "#34A853")))
        }
        .frame(width: size, height: size)
    }
}
