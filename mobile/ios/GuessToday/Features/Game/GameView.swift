import SwiftUI

struct GameView: View {
    let mode: GameMode
    let initialDate: String?
    @StateObject private var vm: GameViewModel
    @State private var showRules = false
    @State private var showArchive = false
    @FocusState private var inputFocused: Bool

    private var rulesSeen: Bool {
        UserDefaults.standard.bool(forKey: "rules_seen_\(mode.statsKey)")
    }

    init(mode: GameMode, initialDate: String? = nil) {
        self.mode = mode
        self.initialDate = initialDate
        _vm = StateObject(wrappedValue: GameViewModel(mode: mode))
    }

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            if vm.isLoading && vm.challenge == nil {
                ProgressView()
                    .tint(Theme.gold)
            } else if vm.notFound {
                NotFoundView(
                    mode: mode,
                    viewingDate: vm.viewingDate,
                    onPrev: { Task { await vm.navigatePrev() } },
                    onNext: { Task { await vm.navigateNext() } },
                    onReturnToday: { Task { await vm.returnToToday() } }
                )
            } else if let errorMsg = vm.error, vm.challenge == nil {
                ErrorView(message: errorMsg) {
                    Task { await vm.loadToday() }
                }
            } else if let challenge = vm.challenge {
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(spacing: Theme.spacing16) {
                            // Date navigation bar (always visible)
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
                                    .id("\(challenge.challengeId)-\(challenge.hintsRevealed)")
                                }
                                .padding(.horizontal, Theme.spacing16)
                                .id("hintsSection")
                            }

                            // Attempt dots
                            AttemptDots(
                                attempts: challenge.attempts,
                                maxAttempts: challenge.maxAttempts
                            )
                            .padding(.horizontal, Theme.spacing16)

                            // Game result banner (shown after game over)
                            if challenge.isGameOver {
                                GameResultBanner(
                                    challenge: challenge,
                                    filmResult: vm.filmResult,
                                    wikiResult: vm.wikiResult
                                )
                                .padding(.horizontal, Theme.spacing16)
                            }

                            // Input area (only for active game, today's challenge)
                            GuessInputSection(vm: vm, inputFocused: $inputFocused)
                                .padding(.horizontal, Theme.spacing16)
                                .id("guessInput")

                            Spacer(minLength: Theme.spacing24)
                        }
                        .padding(.top, Theme.spacing8)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onChange(of: inputFocused) { _, focused in
                        if focused {
                            withAnimation(.easeOut(duration: 0.3)) {
                                proxy.scrollTo("guessInput", anchor: .bottom)
                            }
                        }
                    }
                    .onChange(of: challenge.attempts.count) { _, _ in
                        withAnimation(.easeOut(duration: 0.25)) {
                            proxy.scrollTo("guessInput", anchor: .bottom)
                        }
                    }
                }
            }
        }
        .navigationTitle(mode.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Theme.background, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 14) {
                    // Only show archive button for today's challenge (not when already browsing past)
                    if initialDate == nil {
                        Button {
                            showArchive = true
                        } label: {
                            Image(systemName: "calendar")
                                .font(.system(size: 16))
                                .foregroundColor(Theme.textDim)
                        }
                        .accessibilityLabel("Archive")
                    }
                    Button {
                        showRules = true
                    } label: {
                        Image(systemName: "questionmark.circle")
                            .font(.system(size: 16))
                            .foregroundColor(Theme.textDim)
                    }
                    .accessibilityLabel("Règles du jeu")
                }
            }
        }
        .task {
            if let date = initialDate {
                await vm.loadDate(date)
            } else {
                await vm.loadToday()
            }
            // Show rules on first visit for this mode (only for today's challenges)
            if initialDate == nil && !rulesSeen {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                    showRules = true
                }
            }
        }
        .sheet(isPresented: $vm.showWinSheet) {
            WinSheet(vm: vm)
        }
        .sheet(isPresented: $vm.showLoseSheet) {
            LoseSheet(vm: vm)
        }
        .sheet(isPresented: $showRules) {
            RulesSheet(mode: mode)
        }
        .sheet(isPresented: $showArchive) {
            ArchiveView(initialMode: mode)
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

            VStack(spacing: 2) {
                HStack(spacing: 6) {
                    Text(formattedDate(challenge.date))
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Theme.text)
                    Text("#\(challenge.challengeNumber)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Theme.textDim)
                }
                if viewingDate != nil {
                    Button("Retour à aujourd'hui", action: onReturnToday)
                        .font(.system(size: 11))
                        .foregroundColor(Theme.gold)
                }
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
    @ObservedObject var vm: GameViewModel
    var inputFocused: FocusState<Bool>.Binding

    private var canGuess: Bool { !vm.inputText.trimmingCharacters(in: .whitespaces).isEmpty }

    var body: some View {
        // Access vm.challenge directly so @Observable registers this view as an observer.
        // Without this, SwiftUI skips re-rendering when only vm.challenge changes.
        if let challenge = vm.challenge, !challenge.isGameOver {
            inputContent(challenge: challenge)
        }
    }

    @ViewBuilder
    private func inputContent(challenge: ChallengePayload) -> some View {
        let attemptsLeft = challenge.maxAttempts - challenge.attemptsUsed
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
                            .foregroundColor(inputFocused.wrappedValue ? Theme.gold : Theme.muted)

                        TextField("Votre réponse…", text: Binding(
                            get: { vm.inputText },
                            set: { vm.onInputChange($0) }
                        ))
                        .textFieldStyle(.plain)
                        .font(.system(size: 15))
                        .foregroundColor(Theme.text)
                        .tint(Theme.gold)
                        .autocorrectionDisabled()
                        .focused(inputFocused)
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
                            .stroke(inputFocused.wrappedValue ? Theme.gold.opacity(0.55) : Theme.border, lineWidth: 1)
                    )
                    .shadow(
                        color: inputFocused.wrappedValue ? Theme.gold.opacity(0.18) : .clear,
                        radius: 6, x: 0, y: 0
                    )
                    .animation(.easeInOut(duration: 0.18), value: inputFocused.wrappedValue)
                    .modifier(ShakeEffect(amount: vm.shakeAmount))

                    Button {
                        inputFocused.wrappedValue = false
                        Task { await vm.submitGuess(vm.inputText) }
                    } label: {
                        Text("Deviner")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(canGuess ? Color(hex: "#1a0f00") : Theme.muted)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 11)
                            .background(
                                canGuess
                                ? LinearGradient(
                                    colors: [Color(hex: "#e8c06a"), Color(hex: "#d4a64a"), Color(hex: "#a07030")],
                                    startPoint: .top, endPoint: .bottom
                                  )
                                : LinearGradient(
                                    colors: [Theme.surfaceAlt, Theme.surfaceAlt],
                                    startPoint: .top, endPoint: .bottom
                                  )
                            )
                            .cornerRadius(Theme.radiusM)
                    }
                    .disabled(!canGuess)
                    .animation(.easeInOut(duration: 0.15), value: canGuess)
                }

                // Autocomplete dropdown (floats above)
                if !vm.searchResults.isEmpty {
                    SearchDropdown(results: vm.searchResults) { item in
                        vm.selectSearchResult(item)
                        inputFocused.wrappedValue = false
                    }
                    .offset(y: -58)
                }
            }

            // Skip link
            Button {
                inputFocused.wrappedValue = false
                Task { await vm.skipAttempt() }
            } label: {
                Text("Passer")
                    .font(.system(size: 13, weight: .medium))
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

private struct ProfileSectionHeader: View {
    let label: String
    var body: some View {
        Text(label.uppercased())
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(Theme.textDim)
            .tracking(1.2)
    }
}

private struct PoliticianProfileView: View {
    let profile: WikiProfile
    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Label("Fonctions politiques", systemImage: "building.columns")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.gold)
            let roles = profile.roles ?? []
            if roles.isEmpty {
                Text("Fonctions non renseignées.")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textDim)
                    .italic()
            } else {
                ForEach(roles.indices, id: \.self) { i in
                    let role = roles[i]
                    VStack(alignment: .leading, spacing: 2) {
                        Text(role.title)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(Theme.text)
                        let meta = [role.years, role.country].compactMap { $0 }.joined(separator: " · ")
                        if !meta.isEmpty {
                            Text(meta).font(.system(size: 11)).foregroundColor(Theme.textDim)
                        }
                        let transit = [
                            role.predecessor.map { "← \($0)" },
                            role.successor.map   { "\($0) →" }
                        ].compactMap { $0 }.joined(separator: " · ")
                        if !transit.isEmpty {
                            Text(transit).font(.system(size: 11)).foregroundColor(Theme.textDim)
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
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            let sportLabel = profile.sport.map { "Carrière sportive · \($0)" } ?? "Carrière sportive"
            Label(sportLabel, systemImage: "trophy")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.gold)

            let youth  = profile.clubsYouth ?? []
            let senior = profile.clubs ?? []
            let highlights = profile.careerHighlights ?? []

            if youth.isEmpty && senior.isEmpty && highlights.isEmpty {
                Text("Carrière en cours de consolidation.")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textDim)
                    .italic()
            } else {
                if !youth.isEmpty {
                    ProfileSectionHeader(label: "Parcours junior")
                    ClubsTable(clubs: youth, showStats: false)
                }
                if !senior.isEmpty {
                    ProfileSectionHeader(label: "Parcours senior")
                    ClubsTable(clubs: senior, showStats: true)
                }
                if !highlights.isEmpty && senior.isEmpty {
                    ForEach(highlights.indices, id: \.self) { i in
                        HStack(alignment: .top, spacing: 8) {
                            Text(highlights[i].label)
                                .font(.system(size: 11)).foregroundColor(Theme.textDim)
                                .frame(minWidth: 70, alignment: .leading)
                            Text(highlights[i].value)
                                .font(.system(size: 12)).foregroundColor(Theme.text)
                        }
                    }
                }
                if let nt = profile.nationalTeam {
                    Divider().overlay(Theme.border)
                    let ntInfo = [
                        nt.caps.map  { "\($0) sél." },
                        nt.goals.map { "\($0) b." }
                    ].compactMap { $0 }.joined(separator: " · ")
                    Text(ntInfo.isEmpty ? nt.name : "\(nt.name) · \(ntInfo)")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textDim)
                }
            }
        }
    }
}

private struct ClubsTable: View {
    let clubs: [WikiClub]
    let showStats: Bool
    var body: some View {
        VStack(spacing: 0) {
            ForEach(clubs.indices, id: \.self) { i in
                let club = clubs[i]
                HStack(spacing: 6) {
                    Text(club.years ?? "—")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(Theme.text)
                        .frame(width: 72, alignment: .leading)
                    Text(club.name)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.text)
                    Spacer()
                    if showStats {
                        let stat: String = {
                            if let a = club.apps, let g = club.goals { return "\(a) (\(g))" }
                            if let a = club.apps { return "\(a)" }
                            return "—"
                        }()
                        Text(stat)
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(Theme.textDim)
                    }
                }
                .padding(.vertical, 4)
                if i < clubs.count - 1 {
                    Divider().overlay(Theme.border.opacity(0.4))
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Theme.background.opacity(0.3))
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.border.opacity(0.4), lineWidth: 1))
    }
}

private struct GenericProfileView: View {
    let profile: WikiProfile
    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Label("Biographie", systemImage: "person.text.rectangle")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Theme.gold)

            let highlights = profile.highlights ?? []
            let parts = profile.notableWorkParts ?? (profile.notableWork.map { [$0] } ?? [])

            if !highlights.isEmpty {
                ProfileSectionHeader(label: "Repères")
                ForEach(highlights.indices, id: \.self) { i in
                    HStack(alignment: .top, spacing: 8) {
                        Text(highlights[i].label)
                            .font(.system(size: 11)).foregroundColor(Theme.textDim)
                            .frame(minWidth: 70, alignment: .leading)
                        Text(highlights[i].value)
                            .font(.system(size: 12)).foregroundColor(Theme.text)
                    }
                }
            }
            if let company = profile.company, !company.trimmingCharacters(in: .whitespaces).isEmpty {
                HStack(spacing: 4) {
                    Text("Entreprise(s) ·").font(.system(size: 12)).foregroundColor(Theme.textDim)
                    Text(company).font(.system(size: 12)).foregroundColor(Theme.text)
                }
            }
            if let domain = profile.domain, !domain.trimmingCharacters(in: .whitespaces).isEmpty {
                HStack(spacing: 4) {
                    Text("Domaine ·").font(.system(size: 12)).foregroundColor(Theme.textDim)
                    Text(domain).font(.system(size: 12)).foregroundColor(Theme.text)
                }
            }
            if parts.count > 1 {
                ProfileSectionHeader(label: "Œuvres & faits")
                ForEach(parts.indices, id: \.self) { i in
                    HStack(alignment: .top, spacing: 6) {
                        Text("•").font(.system(size: 11)).foregroundColor(Theme.textDim)
                        Text(parts[i]).font(.system(size: 12)).foregroundColor(Theme.text)
                    }
                }
            } else if parts.count == 1 {
                HStack(spacing: 4) {
                    Text("Œuvre notable ·").font(.system(size: 12)).foregroundColor(Theme.textDim)
                    Text(parts[0]).font(.system(size: 12)).foregroundColor(Theme.text)
                }
            }
            if let era = profile.era, !era.trimmingCharacters(in: .whitespaces).isEmpty {
                HStack(spacing: 4) {
                    Text("Période ·").font(.system(size: 12)).foregroundColor(Theme.textDim)
                    Text(era).font(.system(size: 12)).foregroundColor(Theme.text)
                }
            }
            if highlights.isEmpty && parts.isEmpty && profile.company == nil && profile.domain == nil && profile.era == nil {
                Text("Informations non renseignées.")
                    .font(.system(size: 13)).foregroundColor(Theme.textDim).italic()
            }
        }
    }
}

// MARK: - Not found

private struct NotFoundView: View {
    let mode: GameMode
    let viewingDate: String?
    let onPrev: () -> Void
    let onNext: () -> Void
    let onReturnToday: () -> Void

    private var isToday: Bool { viewingDate == nil }

    private var modeLabel: String {
        switch mode {
        case .film:   return "Films"
        case .series: return "Séries"
        case .wiki:   return "Personnalités"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Nav bar (same layout as DateNavBar)
            HStack {
                Button(action: onPrev) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Theme.text)
                }

                Spacer()

                VStack(spacing: 2) {
                    Text(isToday ? "Aujourd'hui" : formattedDate(viewingDate!))
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Theme.text)
                    if !isToday {
                        Button("Retour à aujourd'hui", action: onReturnToday)
                            .font(.system(size: 11))
                            .foregroundColor(Theme.gold)
                    }
                }

                Spacer()

                Button(action: onNext) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(isToday ? Theme.muted : Theme.text)
                }
                .disabled(isToday)
            }
            .padding(.horizontal, Theme.spacing16)
            .padding(.vertical, Theme.spacing8)

            Spacer()

            VStack(spacing: Theme.spacing12) {
                ZStack {
                    Circle()
                        .fill(Theme.surfaceAlt)
                        .frame(width: 72, height: 72)
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.system(size: 30))
                        .foregroundColor(Theme.textDim)
                }

                VStack(spacing: 6) {
                    Text("Aucun défi \(modeLabel) planifié")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(Theme.text)
                        .multilineTextAlignment(.center)

                    Text("Utilise les flèches pour naviguer\nvers une date avec un défi.")
                        .font(.system(size: 14))
                        .foregroundColor(Theme.textDim)
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)
                }
            }
            .padding(Theme.spacing24)

            Spacer()
        }
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

// MARK: - Attempt dots

private struct AttemptDots: View {
    let attempts: [AttemptEntry]
    let maxAttempts: Int

    var body: some View {
        HStack(spacing: 8) {
            ForEach(0..<maxAttempts, id: \.self) { i in
                if i < attempts.count {
                    let attempt = attempts[i]
                    Circle()
                        .fill(attempt.correct ? Theme.green
                              : attempt.guess.isEmpty ? Theme.muted.opacity(0.35)
                              : Theme.red)
                        .frame(width: 10, height: 10)
                        .overlay(
                            Circle().stroke(
                                attempt.correct ? Theme.green.opacity(0.6)
                                : attempt.guess.isEmpty ? Theme.muted.opacity(0.4)
                                : Theme.red.opacity(0.6),
                                lineWidth: 1
                            )
                        )
                } else {
                    Circle()
                        .strokeBorder(Theme.border, lineWidth: 1.5)
                        .frame(width: 10, height: 10)
                }
            }
            Spacer()
        }
    }
}

// MARK: - Game result banner

private struct GameResultBanner: View {
    let challenge: ChallengePayload
    let filmResult: ChallengeResult?
    let wikiResult: WikiResult?

    private var title: String {
        if let r = wikiResult { return r.name }
        if let r = filmResult {
            if let y = r.year { return "\(r.title) (\(y))" }
            return r.title
        }
        return ""
    }

    private var synopsis: String? {
        if let bio = wikiResult?.bio, !bio.isEmpty { return bio }
        if let s = filmResult?.synopsis, !s.isEmpty { return s }
        return nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            HStack(spacing: Theme.spacing8) {
                Image(systemName: challenge.won ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .font(.system(size: 18))
                    .foregroundColor(challenge.won ? Theme.green : Theme.red)
                Text(challenge.won ? "Bravo !" : "La réponse était…")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(challenge.won ? Theme.green : Theme.text)
                Spacer()
            }

            if !title.isEmpty {
                Text(title)
                    .font(.custom("Georgia", size: 20))
                    .fontWeight(.bold)
                    .foregroundColor(Theme.text)
            }

            if let synopsis {
                Text(synopsis)
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textDim)
                    .lineSpacing(3)
                    .lineLimit(5)
            }
        }
        .padding(Theme.spacing16)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(challenge.won ? Theme.green.opacity(0.3) : Theme.red.opacity(0.3), lineWidth: 1)
        )
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
