import SwiftUI

struct RulesSheet: View {
    let mode: GameMode
    @Environment(\.dismiss) private var dismiss
    @State private var appeared = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.spacing24) {
                        // Icon
                        ZStack {
                            Circle()
                                .fill(modeColor.opacity(0.12))
                                .frame(width: 80, height: 80)
                            Image(systemName: modeIcon)
                                .font(.system(size: 34))
                                .foregroundColor(modeColor)
                        }
                        .scaleEffect(appeared ? 1 : 0.5)
                        .opacity(appeared ? 1 : 0)
                        .padding(.top, Theme.spacing24)

                        // Title
                        VStack(spacing: 6) {
                            Text("Comment jouer")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(Theme.textDim)
                                .textCase(.uppercase)
                                .tracking(1.2)
                            Text(mode.title)
                                .font(.custom("Georgia", size: 26))
                                .fontWeight(.bold)
                                .foregroundColor(Theme.text)
                        }
                        .opacity(appeared ? 1 : 0)
                        .offset(y: appeared ? 0 : 8)

                        // Rules list
                        VStack(spacing: Theme.spacing12) {
                            ForEach(Array(rules.enumerated()), id: \.offset) { i, rule in
                                RuleRow(number: i + 1, text: rule)
                                    .opacity(appeared ? 1 : 0)
                                    .offset(y: appeared ? 0 : 12)
                                    .animation(.spring(response: 0.4, dampingFraction: 0.8).delay(0.1 + Double(i) * 0.07), value: appeared)
                            }
                        }
                        .padding(.horizontal, Theme.spacing16)

                        // Hint legend (film/series only)
                        if !mode.isWiki {
                            HintLegend()
                                .padding(.horizontal, Theme.spacing16)
                                .opacity(appeared ? 1 : 0)
                                .animation(.easeOut.delay(0.4), value: appeared)
                        }

                        Spacer(minLength: Theme.spacing24)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        markSeen()
                        dismiss()
                    } label: {
                        Text("C'est parti !")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(Theme.gold)
                    }
                    .accessibilityLabel("Fermer les règles et commencer")
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
        .onAppear {
            markSeen()
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7).delay(0.05)) {
                appeared = true
            }
        }
    }

    // MARK: - Content by mode

    private var rules: [String] {
        switch mode {
        case .film:
            return [
                "Devinez le film mystère du jour.",
                "L'image est floue au départ — elle se dévoile progressivement à chaque mauvaise réponse.",
                "Jusqu'à 3 indices sont révélés : année, réalisateur, acteur principal…",
                "Vous avez \(maxAttempts) tentatives. Utilisez la barre de recherche pour proposer un titre.",
                "Un nouveau défi chaque jour à minuit (heure de Paris) !",
            ]
        case .series:
            return [
                "Devinez la série mystère du jour.",
                "L'image est floue au départ — elle se dévoile progressivement à chaque mauvaise réponse.",
                "Jusqu'à 3 indices sont révélés : année, créateur, acteur principal…",
                "Vous avez \(maxAttempts) tentatives. Utilisez la barre de recherche pour proposer un titre.",
                "Un nouveau défi chaque jour à minuit (heure de Paris) !",
            ]
        case .wiki:
            return [
                "Devinez la personnalité mystère du jour.",
                "Sa photo reste masquée jusqu'à la fin de la partie.",
                "Des indices sur sa carrière, ses fonctions ou ses clubs sont révélés progressivement.",
                "Vous avez \(maxAttempts) tentatives. Utilisez la barre de recherche pour proposer un nom.",
                "Un nouveau défi chaque jour à minuit (heure de Paris) !",
            ]
        }
    }

    private let maxAttempts = 5

    private var modeIcon: String {
        switch mode {
        case .film:   return "film"
        case .series: return "tv"
        case .wiki:   return "building.columns"
        }
    }

    private var modeColor: Color {
        switch mode {
        case .film:   return Theme.gold
        case .series: return Color(hex: "#8b6ff0")
        case .wiki:   return Theme.green
        }
    }

    private func markSeen() {
        UserDefaults.standard.set(true, forKey: "rules_seen_\(mode.statsKey)")
    }
}

private extension GameMode {
    var isWiki: Bool { self == .wiki }
}

// MARK: - Rule row

private struct RuleRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: Theme.spacing12) {
            Text("\(number)")
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundColor(Theme.gold)
                .frame(width: 24, height: 24)
                .background(Theme.gold.opacity(0.12))
                .clipShape(Circle())

            Text(text)
                .font(.system(size: 15))
                .foregroundColor(Theme.text)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)

            Spacer()
        }
        .padding(Theme.spacing12)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
    }
}

// MARK: - Hint legend

private struct HintLegend: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing8) {
            Text("Légende des tentatives")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Theme.textDim)
                .textCase(.uppercase)
                .tracking(1)

            HStack(spacing: Theme.spacing12) {
                LegendItem(color: Theme.green,  symbol: "●", label: "Bonne réponse")
                LegendItem(color: Theme.red,    symbol: "●", label: "Mauvaise réponse")
                LegendItem(color: Theme.muted,  symbol: "○", label: "Tour passé")
            }
        }
        .padding(Theme.spacing12)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusM).stroke(Theme.border, lineWidth: 1))
    }
}

private struct LegendItem: View {
    let color: Color
    let symbol: String
    let label: String

    var body: some View {
        HStack(spacing: 5) {
            Text(symbol)
                .font(.system(size: 10))
                .foregroundColor(color)
            Text(label)
                .font(.system(size: 11))
                .foregroundColor(Theme.textDim)
        }
    }
}
