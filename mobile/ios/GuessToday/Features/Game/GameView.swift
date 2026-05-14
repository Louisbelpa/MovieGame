import SwiftUI

struct GameView: View {
    let mode: GameMode
    let initialDate: String?
    @State private var vm: GameViewModel

    init(mode: GameMode, initialDate: String? = nil) {
        self.mode = mode
        self.initialDate = initialDate
        _vm = State(initialValue: GameViewModel(mode: mode))
    }

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            if vm.isLoading && vm.challenge == nil {
                ProgressView()
                    .tint(Theme.gold)
            } else if let errorMsg = vm.error, vm.challenge == nil {
                ErrorView(message: errorMsg) {
                    Task { await vm.loadToday() }
                }
            } else if let challenge = vm.challenge {
                ScrollView {
                    VStack(spacing: Theme.spacing16) {
                        // Date navigation bar
                        DateNavBar(
                            challenge: challenge,
                            viewingDate: vm.viewingDate,
                            onPrev: { Task { await vm.navigatePrev() } },
                            onNext: { Task { await vm.navigateNext() } },
                            onReturnToday: { Task { await vm.returnToToday() } }
                        )

                        // Challenge image
                        BlurImageView(
                            url: challenge.displayImageUrl,
                            blurRadius: challenge.blurRadius,
                            isWiki: challenge.isWiki,
                            flashColor: vm.flashColor
                        )
                        .padding(.horizontal, Theme.spacing16)

                        // Wiki profile (if wiki mode)
                        if let profile = challenge.profile {
                            WikiProfileView(profile: profile)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        // Hints grid
                        if challenge.hintsAvailable > 0 {
                            VStack(alignment: .leading, spacing: Theme.spacing8) {
                                Text("INDICES")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(Theme.textDim)
                                    .tracking(1.2)

                                HintsGrid(
                                    hints: challenge.hints,
                                    hintsAvailable: challenge.hintsAvailable,
                                    hintsRevealed: challenge.hintsRevealed,
                                    previousRevealCount: vm.previousHintsRevealed
                                )
                            }
                            .padding(.horizontal, Theme.spacing16)
                        }

                        // Input area (only for active game, today's challenge)
                        if !challenge.isGameOver && !challenge.isPastChallenge {
                            GuessInputSection(vm: vm, challenge: challenge)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        Spacer(minLength: Theme.spacing24)
                    }
                    .padding(.top, Theme.spacing8)
                }
            }
        }
        .navigationTitle(mode.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Text("#\(vm.challenge?.challengeNumber ?? 0)")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Theme.textDim)
            }
        }
        .task {
            if let date = initialDate {
                await vm.loadDate(date)
            } else {
                await vm.loadToday()
            }
        }
        .sheet(isPresented: $vm.showWinSheet) {
            WinSheet(vm: vm)
        }
        .sheet(isPresented: $vm.showLoseSheet) {
            LoseSheet(vm: vm)
        }
    }
}

// MARK: - Sub-components

private struct DateNavBar: View {
    let challenge: ChallengePayload
    let viewingDate: String?
    let onPrev: () -> Void
    let onNext: () -> Void
    let onReturnToday: () -> Void

    var body: some View {
        HStack {
            Button(action: onPrev) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(challenge.hasPrevChallenge ? Theme.text : Theme.muted)
            }
            .disabled(!challenge.hasPrevChallenge)

            Spacer()

            if let viewingDate {
                VStack(spacing: 2) {
                    Text(formattedDate(viewingDate))
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Theme.text)
                    Button("Retour à aujourd'hui", action: onReturnToday)
                        .font(.system(size: 11))
                        .foregroundColor(Theme.gold)
                }
            } else {
                Text("Aujourd'hui")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.text)
            }

            Spacer()

            Button(action: onNext) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor((challenge.hasNextChallenge && challenge.isPastChallenge) ? Theme.text : Theme.muted)
            }
            .disabled(!challenge.hasNextChallenge || !challenge.isPastChallenge)
        }
        .padding(.horizontal, Theme.spacing16)
        .padding(.vertical, Theme.spacing8)
    }

    private func formattedDate(_ date: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "fr_FR")
        guard let d = formatter.date(from: date) else { return date }
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: d)
    }
}

private struct GuessInputSection: View {
    @Bindable var vm: GameViewModel
    let challenge: ChallengePayload
    @FocusState private var focused: Bool

    private var attemptsLeft: Int { challenge.maxAttempts - challenge.attemptsUsed }
    private var canGuess: Bool { !vm.inputText.trimmingCharacters(in: .whitespaces).isEmpty }

    var body: some View {
        VStack(spacing: Theme.spacing12) {
            // Attempt counter
            HStack {
                HStack(spacing: 5) {
                    ForEach(0..<challenge.maxAttempts, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(i < challenge.attemptsUsed ? Theme.red.opacity(0.8) : Theme.surfaceAlt)
                            .frame(height: 4)
                    }
                }
                Spacer()
                Text("\(attemptsLeft) essai\(attemptsLeft > 1 ? "s" : "") restant\(attemptsLeft > 1 ? "s" : "")")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textDim)
            }

            // Search field + dropdown
            ZStack(alignment: .bottom) {
                HStack(spacing: Theme.spacing8) {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 14))
                            .foregroundColor(focused ? Theme.gold : Theme.muted)

                        TextField("Votre réponse…", text: Binding(
                            get: { vm.inputText },
                            set: { vm.onInputChange($0) }
                        ))
                        .textFieldStyle(.plain)
                        .font(.system(size: 15))
                        .foregroundColor(Theme.text)
                        .tint(Theme.gold)
                        .autocorrectionDisabled()
                        .focused($focused)
                        .onSubmit {
                            guard canGuess else { return }
                            Task { await vm.submitGuess(vm.inputText) }
                        }

                        if vm.isSearching {
                            ProgressView().tint(Theme.gold).scaleEffect(0.7)
                        } else if !vm.inputText.isEmpty {
                            Button { vm.onInputChange("") } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(Theme.muted)
                                    .font(.system(size: 14))
                            }
                        }
                    }
                    .padding(.horizontal, Theme.spacing12)
                    .padding(.vertical, 13)
                    .background(Theme.surface)
                    .cornerRadius(Theme.radiusM)
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.radiusM)
                            .stroke(focused ? Theme.gold.opacity(0.6) : Theme.border, lineWidth: 1)
                    )
                    .modifier(ShakeEffect(amount: vm.shakeAmount))

                    Button {
                        focused = false
                        Task { await vm.submitGuess(vm.inputText) }
                    } label: {
                        Text("Deviner")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(canGuess ? Theme.background : Theme.muted)
                            .padding(.horizontal, Theme.spacing16)
                            .padding(.vertical, 13)
                            .background(canGuess ? Theme.gold : Theme.surfaceAlt)
                            .cornerRadius(Theme.radiusM)
                    }
                    .disabled(!canGuess)
                    .animation(.easeInOut(duration: 0.15), value: canGuess)
                }

                // Autocomplete dropdown (floats above)
                if !vm.searchResults.isEmpty {
                    SearchDropdown(results: vm.searchResults) { item in
                        vm.selectSearchResult(item)
                        focused = false
                    }
                    .offset(y: -58)
                }
            }

            // Skip link
            Button {
                focused = false
                Task { await vm.skipAttempt() }
            } label: {
                Text("Passer ce tour →")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textDim)
            }
        }
    }
}

private struct WikiProfileView: View {
    let profile: WikiProfile

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            switch profile.type {
            case "politician":
                PoliticianProfileView(profile: profile)
            case "sportsperson":
                SportspersonProfileView(profile: profile)
            default:
                GenericProfileView(profile: profile)
            }
        }
        .padding(Theme.spacing12)
        .cardStyle()
    }
}

private struct PoliticianProfileView: View {
    let profile: WikiProfile
    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Label("Fonctions", systemImage: "building.columns")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.gold)
            if let roles = profile.roles {
                ForEach(roles.indices, id: \.self) { i in
                    let role = roles[i]
                    VStack(alignment: .leading, spacing: 2) {
                        Text(role.title)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Theme.text)
                        HStack(spacing: 8) {
                            if let years = role.years {
                                Text(years).font(.system(size: 11)).foregroundColor(Theme.textDim)
                            }
                            if let country = role.country {
                                Text(country).font(.system(size: 11)).foregroundColor(Theme.textDim)
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct SportspersonProfileView: View {
    let profile: WikiProfile
    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            if let sport = profile.sport {
                Label(sport, systemImage: "sportscourt")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Theme.text)
            }
            if let clubs = profile.clubs, !clubs.isEmpty {
                Text("Clubs")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Theme.gold)
                ForEach(clubs.indices, id: \.self) { i in
                    let club = clubs[i]
                    HStack {
                        Text(club.name).font(.system(size: 13)).foregroundColor(Theme.text)
                        Spacer()
                        if let years = club.years {
                            Text(years).font(.system(size: 11)).foregroundColor(Theme.textDim)
                        }
                    }
                }
            }
            if let nt = profile.nationalTeam {
                HStack {
                    Label(nt.name, systemImage: "flag")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textDim)
                    Spacer()
                    if let caps = nt.caps {
                        Text("\(caps) sél.")
                            .font(.system(size: 11))
                            .foregroundColor(Theme.muted)
                    }
                }
            }
            if let highlights = profile.careerHighlights, !highlights.isEmpty {
                ForEach(highlights.indices, id: \.self) { i in
                    HStack(alignment: .top, spacing: 8) {
                        Text(highlights[i].label)
                            .font(.system(size: 11))
                            .foregroundColor(Theme.textDim)
                            .frame(width: 80, alignment: .leading)
                        Text(highlights[i].value)
                            .font(.system(size: 12))
                            .foregroundColor(Theme.text)
                    }
                }
            }
        }
    }
}

private struct GenericProfileView: View {
    let profile: WikiProfile
    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            if let domain = profile.domain {
                Label(domain, systemImage: "star")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Theme.text)
            }
            if let highlights = profile.highlights {
                ForEach(highlights.indices, id: \.self) { i in
                    HStack(alignment: .top, spacing: 8) {
                        Text(highlights[i].label)
                            .font(.system(size: 11))
                            .foregroundColor(Theme.textDim)
                            .frame(width: 80, alignment: .leading)
                        Text(highlights[i].value)
                            .font(.system(size: 13))
                            .foregroundColor(Theme.text)
                    }
                }
            }
        }
    }
}

private struct ErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: Theme.spacing16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundColor(Theme.amber)
            Text(message)
                .font(.system(size: 14))
                .foregroundColor(Theme.textDim)
                .multilineTextAlignment(.center)
            Button("Réessayer", action: retry)
                .buttonStyle(PrimaryButtonStyle())
                .frame(width: 160)
        }
        .padding(Theme.spacing24)
    }
}

// MARK: - Shake animation

struct ShakeEffect: GeometryEffect {
    var amount: Double
    var animatableData: Double {
        get { amount }
        set { amount = newValue }
    }

    func effectValue(size: CGSize) -> ProjectionTransform {
        let angle = sin(amount * .pi * 4) * 6
        return ProjectionTransform(CGAffineTransform(translationX: angle, y: 0))
    }
}
