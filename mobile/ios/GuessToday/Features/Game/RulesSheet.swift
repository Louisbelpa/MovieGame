import SwiftUI

struct RulesSheet: View {
    let mode: GameMode
    @Environment(\.dismiss) private var dismiss
    @State private var appeared = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Theme.background.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Hero header
                    ZStack {
                        // Gradient background
                        LinearGradient(
                            colors: [modeColor.opacity(0.28), modeColor.opacity(0.06), Theme.background],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                        .frame(height: 220)

                        VStack(spacing: Theme.spacing12) {
                            // Icon ring
                            ZStack {
                                Circle()
                                    .fill(modeColor.opacity(0.15))
                                    .frame(width: 90, height: 90)
                                Circle()
                                    .stroke(modeColor.opacity(0.30), lineWidth: 1.5)
                                    .frame(width: 90, height: 90)
                                Image(systemName: mode.iconFilled)
                                    .font(.system(size: 38, weight: .medium))
                                    .foregroundColor(modeColor)
                            }
                            .scaleEffect(appeared ? 1 : 0.55)
                            .opacity(appeared ? 1 : 0)

                            VStack(spacing: 4) {
                                Text("Comment jouer")
                                    .font(Theme.inter(size: 11, weight: .semibold))
                                    .foregroundColor(modeColor.opacity(0.8))
                                    .textCase(.uppercase)
                                    .tracking(1.5)
                                Text(mode.title)
                                    .font(Theme.fraunces(size: 28))
                                    .fontWeight(.bold)
                                    .foregroundColor(Theme.text)
                            }
                            .opacity(appeared ? 1 : 0)
                            .offset(y: appeared ? 0 : 10)
                        }
                        .padding(.top, Theme.spacing24)
                    }

                    // Rules steps
                    VStack(spacing: Theme.spacing8) {
                        ForEach(Array(steps.enumerated()), id: \.offset) { i, step in
                            StepCard(
                                number: i + 1,
                                icon: step.icon,
                                title: step.title,
                                description: step.description,
                                color: modeColor
                            )
                            .opacity(appeared ? 1 : 0)
                            .offset(y: appeared ? 0 : 16)
                            .animation(.spring(response: 0.45, dampingFraction: 0.8).delay(0.12 + Double(i) * 0.07), value: appeared)
                        }
                    }
                    .padding(.horizontal, Theme.spacing16)
                    .padding(.top, Theme.spacing8)

                    // Hint legend (film/series only)
                    if !mode.isWiki {
                        AttemptLegend(color: modeColor)
                            .padding(.horizontal, Theme.spacing16)
                            .padding(.top, Theme.spacing16)
                            .opacity(appeared ? 1 : 0)
                            .animation(.easeOut.delay(0.45), value: appeared)
                    }

                    // Bottom padding for the fixed button
                    Color.clear.frame(height: 100)
                }
            }

            // Fixed CTA button
            VStack(spacing: 0) {
                LinearGradient(
                    colors: [Theme.background.opacity(0), Theme.background],
                    startPoint: .top, endPoint: .bottom
                )
                .frame(height: 32)

                Button {
                    markSeen()
                    dismiss()
                } label: {
                    Text("C'est parti !")
                        .font(Theme.inter(size: 16, weight: .bold))
                        .foregroundColor(Theme.primaryButtonFg)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Theme.goldGradient)
                        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusM))
                }
                .padding(.horizontal, Theme.spacing16)
                .padding(.bottom, Theme.spacing24)
                .background(Theme.background)
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.72).delay(0.05)) {
                appeared = true
            }
        }
    }

    // MARK: - Steps

    private struct Step {
        let icon: String
        let title: String
        let description: String
    }

    private var steps: [Step] {
        switch mode {
        case .film:
            return [
                Step(icon: "photo.fill", title: "Scène révélée", description: "Une scène du film est affichée. Sers-t'en comme indice visuel pour identifier le film."),
                Step(icon: "list.bullet", title: "Indices progressifs", description: "Jusqu'à 3 indices sont révélés : année de sortie, réalisateur, acteur principal."),
                Step(icon: "film", title: "Proposez un titre", description: "Saisissez votre réponse dans le champ prévu. Vous avez \(maxAttempts) tentatives."),
                Step(icon: "clock.fill", title: "Un défi par jour", description: "Un nouveau film mystère chaque jour à minuit, heure de Paris. Revenez demain !"),
            ]
        case .series:
            return [
                Step(icon: "photo.fill", title: "Scène révélée", description: "Une scène de la série est affichée. Sers-t'en comme indice visuel pour identifier la série."),
                Step(icon: "list.bullet", title: "Indices progressifs", description: "Jusqu'à 3 indices sont révélés : année de sortie, créateur, acteur principal."),
                Step(icon: "tv", title: "Proposez un titre", description: "Saisissez votre réponse dans le champ prévu. Vous avez \(maxAttempts) tentatives."),
                Step(icon: "clock.fill", title: "Un défi par jour", description: "Une nouvelle série mystère chaque jour à minuit, heure de Paris. Revenez demain !"),
            ]
        case .wiki:
            return [
                Step(icon: "eye.slash.fill", title: "Photo masquée", description: "La photo de la personnalité reste cachée tout au long de la partie — découvrez-la à la fin."),
                Step(icon: "list.bullet", title: "Indices progressifs", description: "Des indices sur sa carrière, ses fonctions, ses clubs ou sa vie sont révélés après chaque mauvaise réponse."),
                Step(icon: "person.bust", title: "Proposez un nom", description: "Saisissez votre réponse dans le champ prévu. Vous avez \(maxAttempts) tentatives."),
                Step(icon: "clock.fill", title: "Un défi par jour", description: "Une nouvelle personnalité mystère chaque jour à minuit, heure de Paris. Revenez demain !"),
            ]
        }
    }

    private let maxAttempts = 5

    private var modeColor: Color { mode.color }

    private func markSeen() {
        UserDefaults.standard.set(true, forKey: "rules_seen_\(mode.statsKey)")
    }
}

private extension GameMode {
    var isWiki: Bool { self == .wiki }
}

// MARK: - Step card

private struct StepCard: View {
    let number: Int
    let icon: String
    let title: String
    let description: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: Theme.spacing12) {
            // Number + icon badge
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(color.opacity(0.12))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(color)
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text("\(number)")
                        .font(Theme.inter(size: 10, weight: .bold))
                        .foregroundColor(color)
                        .frame(width: 16, height: 16)
                        .background(color.opacity(0.15))
                        .clipShape(Circle())
                    Text(title)
                        .font(Theme.inter(size: 14, weight: .semibold))
                        .foregroundColor(Theme.text)
                }
                Text(description)
                    .font(Theme.inter(size: 13))
                    .foregroundColor(Theme.textDim)
                    .lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .padding(Theme.spacing12)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(Theme.border, lineWidth: 1)
        )
    }
}

// MARK: - Attempt legend

private struct AttemptLegend: View {
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            Text("Résultat de chaque tentative")
                .font(Theme.inter(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            HStack(spacing: 0) {
                LegendDot(color: Theme.green,  label: "Bonne\nréponse")
                Spacer()
                LegendDot(color: Theme.red,    label: "Mauvaise\nréponse")
                Spacer()
                LegendDot(color: Theme.muted,  label: "Tour\npassé", hollow: true)
            }
        }
        .padding(Theme.spacing16)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(Theme.border, lineWidth: 1)
        )
    }
}

private struct LegendDot: View {
    let color: Color
    let label: String
    var hollow: Bool = false

    var body: some View {
        VStack(spacing: 6) {
            if hollow {
                Circle()
                    .stroke(color, lineWidth: 2)
                    .frame(width: 20, height: 20)
            } else {
                Circle()
                    .fill(color)
                    .frame(width: 20, height: 20)
            }
            Text(label)
                .font(Theme.inter(size: 11))
                .foregroundColor(Theme.textDim)
                .multilineTextAlignment(.center)
                .lineSpacing(1)
        }
    }
}
