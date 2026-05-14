import SwiftUI

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
                            Text("GuessToday")
                                .font(.custom("Georgia", size: 28))
                                .fontWeight(.bold)
                                .foregroundColor(Theme.gold)
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

                        Divider()
                            .background(Theme.border)
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
                            .font(.custom("Georgia", size: 24))
                            .fontWeight(.bold)
                            .foregroundColor(Theme.text)
                        Text("Sauvegardez vos stats et défiez vos amis")
                            .font(.system(size: 14))
                            .foregroundColor(Theme.textDim)
                    }
                    .padding(.top, Theme.spacing24)

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
