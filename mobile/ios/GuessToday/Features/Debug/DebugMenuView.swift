#if DEBUG || NRT
import SwiftUI

struct DebugMenuView: View {
    @Environment(AuthViewModel.self) var auth
    @State private var pendingEnvironment: AppEnvironment? = nil
    @State private var showConfirm = false
    @State private var currentEnv: AppEnvironment = EnvironmentManager.shared.current
    @State private var customURLDraft: String = EnvironmentManager.shared.customBaseURL
    @State private var useMockData: Bool = FeatureFlags.shared.useMockData

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: Theme.spacing20) {
                    // Active environment banner
                    DebugActiveBanner(env: currentEnv, effectiveURL: EnvironmentManager.shared.baseURL)
                        .padding(.horizontal, Theme.spacing16)

                    // Build info card
                    DebugBuildInfoCard()
                        .padding(.horizontal, Theme.spacing16)

                    // Feature flags
                    DebugFeatureFlagsSection(useMockData: $useMockData)
                        .padding(.horizontal, Theme.spacing16)

                    // Environment picker
                    DebugEnvPickerSection(
                        current: currentEnv,
                        onSelect: { env in
                            guard env != currentEnv else { return }
                            pendingEnvironment = env
                            showConfirm = true
                        }
                    )
                    .padding(.horizontal, Theme.spacing16)

                    // Custom URL input (visible seulement en mode .custom)
                    if currentEnv == .custom {
                        DebugCustomURLSection(
                            urlDraft: $customURLDraft,
                            onApply: {
                                let trimmed = customURLDraft.trimmingCharacters(in: .whitespaces)
                                EnvironmentManager.shared.customBaseURL = trimmed
                                APIClient.shared.clearSession()
                            }
                        )
                        .padding(.horizontal, Theme.spacing16)
                    }

                    Spacer(minLength: Theme.spacing24)
                }
                .padding(.top, Theme.spacing16)
            }
        }
        .navigationTitle("Debug")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .confirmationDialog(
            "Changer l'environnement ?",
            isPresented: $showConfirm,
            titleVisibility: .visible
        ) {
            if let env = pendingEnvironment {
                Button("Passer à \(env.displayName)", role: .destructive) {
                    EnvironmentManager.shared.switchTo(env)
                    auth.user = nil
                    currentEnv = env
                    customURLDraft = EnvironmentManager.shared.customBaseURL
                    pendingEnvironment = nil
                }
            }
            Button("Annuler", role: .cancel) { pendingEnvironment = nil }
        } message: {
            if let env = pendingEnvironment {
                let url = env == .custom
                    ? (EnvironmentManager.shared.customBaseURL.isEmpty ? env.defaultBaseURL : EnvironmentManager.shared.customBaseURL)
                    : env.defaultBaseURL
                Text("La session sera déconnectée. L'app pointera vers :\n\(url)")
            }
        }
    }
}

// MARK: - Active environment banner

private struct DebugActiveBanner: View {
    let env: AppEnvironment
    let effectiveURL: String

    private var color: Color {
        switch env {
        case .localhost:   return Theme.green
        case .custom:      return Color(hex: "#a78bfa")   // violet
        case .staging:     return Theme.amber
        case .production:  return Theme.gold
        }
    }

    var body: some View {
        HStack(spacing: Theme.spacing12) {
            Image(systemName: env.icon)
                .font(.system(size: 18))
                .foregroundColor(color)

            VStack(alignment: .leading, spacing: 2) {
                Text("Environnement actif")
                    .font(Theme.inter(size: 10, weight: .semibold))
                    .foregroundColor(color.opacity(0.7))
                    .textCase(.uppercase)
                    .tracking(0.8)
                Text(env.displayName)
                    .font(Theme.inter(size: 17, weight: .semibold))
                    .foregroundColor(color)
                Text(effectiveURL)
                    .font(Theme.inter(size: 11))
                    .foregroundColor(color.opacity(0.6))
                    .lineLimit(1)
                    .truncationMode(.middle)
            }

            Spacer()

            if env != AppEnvironment.compilationDefault {
                Label("≠ défaut", systemImage: "exclamationmark.triangle.fill")
                    .font(Theme.inter(size: 10, weight: .semibold))
                    .foregroundColor(Theme.amber)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 4)
                    .background(Theme.amber.opacity(0.15))
                    .cornerRadius(6)
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.amber.opacity(0.3), lineWidth: 1))
            }
        }
        .padding(Theme.spacing16)
        .background(color.opacity(0.08))
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(color.opacity(0.3), lineWidth: 1))
    }
}

// MARK: - Custom URL input

private struct DebugCustomURLSection: View {
    @Binding var urlDraft: String
    let onApply: () -> Void
    @FocusState private var focused: Bool

    private var detectedIP: String? { EnvironmentManager.detectMacLANIP() }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            DebugSectionLabel("URL personnalisée (device réel)")

            VStack(spacing: 0) {
                // Tip
                HStack(spacing: 8) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 13))
                        .foregroundColor(Theme.textDim)
                    Text("Sur device réel, utilise l'IP LAN de ton Mac : http://192.168.x.x:3001")
                        .font(Theme.inter(size: 12))
                        .foregroundColor(Theme.textDim)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(Theme.spacing12)
                .background(Theme.surfaceAlt)
                .cornerRadius(Theme.radiusS)
                .padding(Theme.spacing12)

                DebugDivider()

                // Auto-detect (utile en simulateur)
                if let ip = detectedIP {
                    Button {
                        urlDraft = "http://\(ip):3001"
                        EnvironmentManager.shared.customBaseURL = urlDraft
                        APIClient.shared.clearSession()
                    } label: {
                        HStack {
                            Image(systemName: "wand.and.stars")
                                .font(.system(size: 13))
                                .foregroundColor(Theme.gold)
                            Text("Utiliser IP détectée : \(ip)")
                                .font(Theme.inter(size: 13))
                                .foregroundColor(Theme.gold)
                            Spacer()
                        }
                        .padding(.horizontal, Theme.spacing16)
                        .padding(.vertical, 12)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    DebugDivider()
                }

                // Text field
                HStack(spacing: Theme.spacing8) {
                    TextField("http://192.168.x.x:3001", text: $urlDraft)
                        .font(Theme.inter(size: 14))
                        .foregroundColor(Theme.text)
                        .tint(Theme.gold)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                        .focused($focused)
                        .onSubmit { onApply(); focused = false }
                        .padding(.leading, Theme.spacing16)
                        .padding(.vertical, 13)

                    Button("Appliquer") {
                        onApply()
                        focused = false
                    }
                    .font(Theme.inter(size: 13, weight: .semibold))
                    .foregroundColor(urlDraft.isEmpty ? Theme.muted : Theme.gold)
                    .disabled(urlDraft.isEmpty)
                    .padding(.trailing, Theme.spacing16)
                    .padding(.vertical, 13)
                }
            }
            .background(Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        }
    }
}

// MARK: - Build info

private struct DebugBuildInfoCard: View {
    private let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
    private let build   = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "?"

    private var scheme: String {
        #if NRT
        return "NRT"
        #else
        return "Debug"
        #endif
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            DebugSectionLabel("Infos build")

            VStack(spacing: 0) {
                DebugInfoRow(label: "Version", value: "\(version) (\(build))")
                DebugDivider()
                DebugInfoRow(label: "Schéma", value: scheme)
                DebugDivider()
                DebugInfoRow(label: "URL active", value: EnvironmentManager.shared.baseURL)
            }
            .background(Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        }
    }
}

// MARK: - Environment picker

private struct DebugEnvPickerSection: View {
    let current: AppEnvironment
    let onSelect: (AppEnvironment) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            DebugSectionLabel("Environnement")

            VStack(spacing: 0) {
                ForEach(Array(AppEnvironment.allCases.enumerated()), id: \.element.id) { idx, env in
                    if idx > 0 { DebugDivider() }
                    DebugEnvRow(
                        env: env,
                        isSelected: env == current,
                        isDefault: env == AppEnvironment.compilationDefault,
                        onTap: { onSelect(env) }
                    )
                }
            }
            .background(Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        }
    }
}

private struct DebugEnvRow: View {
    let env: AppEnvironment
    let isSelected: Bool
    let isDefault: Bool
    let onTap: () -> Void

    private var envColor: Color {
        switch env {
        case .localhost:   return Theme.green
        case .custom:      return Color(hex: "#a78bfa")
        case .staging:     return Theme.amber
        case .production:  return Theme.gold
        }
    }

    private var subtitle: String {
        if env == .custom {
            let saved = EnvironmentManager.shared.customBaseURL
            return saved.isEmpty ? env.defaultBaseURL : saved
        }
        return env.defaultBaseURL
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Theme.spacing12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(envColor.opacity(isSelected ? 0.20 : 0.10))
                        .frame(width: 36, height: 36)
                    Image(systemName: env.icon)
                        .font(.system(size: 15))
                        .foregroundColor(envColor)
                }

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(env.displayName)
                            .font(Theme.inter(size: 15, weight: isSelected ? .semibold : .regular))
                            .foregroundColor(isSelected ? envColor : Theme.text)
                        if isDefault {
                            Text("défaut")
                                .font(Theme.inter(size: 9, weight: .semibold))
                                .foregroundColor(Theme.muted)
                                .textCase(.uppercase)
                                .tracking(0.5)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Theme.surfaceAlt)
                                .cornerRadius(4)
                        }
                    }
                    Text(subtitle)
                        .font(Theme.inter(size: 11))
                        .foregroundColor(Theme.textDim)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(envColor)
                }
            }
            .padding(.horizontal, Theme.spacing16)
            .padding(.vertical, 13)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Reusable sub-views

private struct DebugInfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Text(label)
                .font(Theme.inter(size: 14))
                .foregroundColor(Theme.textDim)
            Spacer()
            Text(value)
                .font(Theme.inter(size: 13, weight: .medium))
                .foregroundColor(Theme.text)
                .multilineTextAlignment(.trailing)
                .lineLimit(3)
        }
        .padding(.horizontal, Theme.spacing16)
        .padding(.vertical, 12)
    }
}

private struct DebugDivider: View {
    var body: some View {
        Divider()
            .background(Theme.border)
            .padding(.leading, Theme.spacing16)
    }
}

private struct DebugSectionLabel: View {
    let title: String
    init(_ title: String) { self.title = title }

    var body: some View {
        Text(title.uppercased())
            .font(Theme.inter(size: 11, weight: .semibold))
            .foregroundColor(Theme.textDim)
            .tracking(1)
    }
}

// MARK: - Feature Flags

private struct DebugFeatureFlagsSection: View {
    @Binding var useMockData: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            DebugSectionLabel("Feature Flags")

            VStack(spacing: 0) {
                DebugFlagRow(
                    icon: "person.2.fill",
                    iconColor: Color(hex: "#a78bfa"),
                    title: "Données mockées",
                    subtitle: "Amis & classement fictifs (pas d'appel réseau)",
                    isOn: $useMockData,
                    onChange: { FeatureFlags.shared.useMockData = $0 }
                )
            }
            .background(Theme.surface)
            .cornerRadius(Theme.radiusM)
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
        }
    }
}

private struct DebugFlagRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String
    @Binding var isOn: Bool
    let onChange: (Bool) -> Void

    var body: some View {
        HStack(spacing: Theme.spacing12) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(iconColor.opacity(isOn ? 0.20 : 0.10))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 15))
                    .foregroundColor(iconColor)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(Theme.inter(size: 15, weight: isOn ? .semibold : .regular))
                    .foregroundColor(isOn ? iconColor : Theme.text)
                Text(subtitle)
                    .font(Theme.inter(size: 11))
                    .foregroundColor(Theme.textDim)
                    .lineLimit(2)
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
                .tint(iconColor)
                .onChange(of: isOn) { _, newValue in onChange(newValue) }
        }
        .padding(.horizontal, Theme.spacing16)
        .padding(.vertical, 13)
    }
}
#endif
