import SwiftUI

struct WinSheet: View {
    @Bindable var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.spacing20) {
                        // Header
                        WinHeaderView(challenge: vm.challenge)
                            .padding(.top, Theme.spacing24)

                        // Result card
                        if let result = vm.filmResult {
                            FilmResultCard(result: result)
                                .padding(.horizontal, Theme.spacing16)
                        } else if let result = vm.wikiResult {
                            WikiResultCard(result: result)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        // Stats row
                        if let c = vm.challenge {
                            StatsRow(attemptsUsed: c.attemptsUsed, hintsUsed: c.hintsRevealed)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        // Streak
                        let stats = vm.loadStats()
                        if stats.currentStreak > 1 {
                            HStack(spacing: 8) {
                                Image(systemName: "flame.fill")
                                    .foregroundColor(Theme.amber)
                                Text("Série de \(stats.currentStreak) !")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Theme.text)
                            }
                        }

                        // Action buttons
                        VStack(spacing: Theme.spacing8) {
                            ShareLink(item: vm.shareText) {
                                Label("Partager mon résultat", systemImage: "square.and.arrow.up")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            .padding(.horizontal, Theme.spacing16)

                            Button("Fermer") { dismiss() }
                                .buttonStyle(SecondaryButtonStyle())
                                .padding(.horizontal, Theme.spacing16)
                        }
                        .padding(.bottom, Theme.spacing24)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Theme.muted)
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
    }
}

struct LoseSheet: View {
    @Bindable var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.spacing20) {
                        // Header
                        VStack(spacing: Theme.spacing8) {
                            Text("💀")
                                .font(.system(size: 52))
                            Text("Raté !")
                                .font(.custom("Georgia", size: 26))
                                .fontWeight(.bold)
                                .foregroundColor(Theme.red)
                            Text("La bonne réponse était…")
                                .font(.system(size: 15))
                                .foregroundColor(Theme.textDim)
                        }
                        .padding(.top, Theme.spacing24)

                        // Result reveal
                        if let result = vm.filmResult {
                            FilmResultCard(result: result)
                                .padding(.horizontal, Theme.spacing16)
                        } else if let result = vm.wikiResult {
                            WikiResultCard(result: result)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        // Stats
                        if let c = vm.challenge {
                            StatsRow(attemptsUsed: c.attemptsUsed, hintsUsed: c.hintsRevealed)
                                .padding(.horizontal, Theme.spacing16)
                        }

                        // Action buttons
                        VStack(spacing: Theme.spacing8) {
                            ShareLink(item: vm.shareText) {
                                Label("Partager mon résultat", systemImage: "square.and.arrow.up")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(SecondaryButtonStyle())
                            .padding(.horizontal, Theme.spacing16)

                            Button("Fermer") { dismiss() }
                                .buttonStyle(PrimaryButtonStyle())
                                .padding(.horizontal, Theme.spacing16)
                        }
                        .padding(.bottom, Theme.spacing24)
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Theme.muted)
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(Theme.background)
    }
}

// MARK: - Win header with animated trophy

private struct WinHeaderView: View {
    let challenge: ChallengePayload?
    @State private var appeared = false

    var body: some View {
        VStack(spacing: Theme.spacing8) {
            Image(systemName: "trophy.fill")
                .font(.system(size: 48))
                .foregroundStyle(Theme.gold)
                .symbolRenderingMode(.hierarchical)
                .symbolEffect(.bounce.up.byLayer, value: appeared)
                .scaleEffect(appeared ? 1 : 0.5)
                .opacity(appeared ? 1 : 0)

            Text("Bravo !")
                .font(.custom("Georgia", size: 26))
                .fontWeight(.bold)
                .foregroundColor(Theme.gold)
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 6)

            if let c = challenge {
                Text("En \(c.attemptsUsed) tentative\(c.attemptsUsed > 1 ? "s" : "")")
                    .font(.system(size: 15))
                    .foregroundColor(Theme.textDim)
                    .opacity(appeared ? 1 : 0)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.65).delay(0.1)) {
                appeared = true
            }
        }
    }
}

// MARK: - Shared result cards

struct FilmResultCard: View {
    let result: ChallengeResult

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            HStack(alignment: .top, spacing: Theme.spacing12) {
                AsyncImage(url: URL(string: result.imageUrl)) { img in
                    img.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle().fill(Theme.surfaceAlt)
                }
                .frame(width: 80, height: 120)
                .clipped()
                .cornerRadius(Theme.radiusS)

                VStack(alignment: .leading, spacing: 6) {
                    Text(result.title)
                        .font(.custom("Georgia", size: 18))
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.text)

                    if let year = result.year {
                        Text("\(year)")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.textDim)
                    }

                    if let director = result.director ?? result.creator {
                        Label(director, systemImage: "person.fill")
                            .font(.system(size: 13))
                            .foregroundColor(Theme.textDim)
                    }

                    if let genres = result.genres, !genres.isEmpty {
                        FlowTags(tags: genres)
                    }
                }
                Spacer()
            }

            if let synopsis = result.synopsis, !synopsis.isEmpty {
                Text(synopsis)
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textDim)
                    .lineLimit(4)
            }

            if let tmdbId = result.tmdbId {
                let type = result.mediaType == "series" ? "tv" : "movie"
                Link(destination: URL(string: "https://www.themoviedb.org/\(type)/\(tmdbId)")!) {
                    Label("Voir sur TMDB", systemImage: "arrow.up.right.square")
                        .font(.system(size: 13))
                        .foregroundColor(Theme.gold)
                }
            }
        }
        .padding(Theme.spacing16)
        .cardStyle()
    }
}

struct WikiResultCard: View {
    let result: WikiResult

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacing12) {
            HStack(alignment: .top, spacing: Theme.spacing12) {
                if let photoUrl = result.photoUrl {
                    AsyncImage(url: URL(string: photoUrl)) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Rectangle().fill(Theme.surfaceAlt)
                    }
                    .frame(width: 80, height: 100)
                    .clipped()
                    .clipShape(Circle())
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(result.name)
                        .font(.custom("Georgia", size: 18))
                        .fontWeight(.semibold)
                        .foregroundColor(Theme.text)

                    Text(personTypeLabel(result.personType))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Theme.gold)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Theme.gold.opacity(0.15))
                        .cornerRadius(4)
                }
                Spacer()
            }

            if let bio = result.bio, !bio.isEmpty {
                Text(bio)
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textDim)
                    .lineLimit(4)
            }

            if let wikiUrl = result.wikipediaUrl, let url = URL(string: wikiUrl) {
                Link(destination: url) {
                    Label("Voir sur Wikipedia", systemImage: "arrow.up.right.square")
                        .font(.system(size: 13))
                        .foregroundColor(Theme.gold)
                }
            }
        }
        .padding(Theme.spacing16)
        .cardStyle()
    }

    private func personTypeLabel(_ type: String) -> String {
        switch type {
        case "politician":       return "Personnalité politique"
        case "sportsperson":     return "Sportif·ve"
        case "artist":           return "Artiste"
        case "scientist":        return "Scientifique"
        case "entrepreneur":     return "Entrepreneur·se"
        case "writer":           return "Écrivain·e"
        case "historical_figure":return "Figure historique"
        default:                 return "Personnalité"
        }
    }
}

struct StatsRow: View {
    let attemptsUsed: Int
    let hintsUsed: Int

    var body: some View {
        HStack {
            StatBox(label: "Tentatives", value: "\(attemptsUsed)")
            Divider().frame(height: 30).background(Theme.border)
            StatBox(label: "Indices", value: "\(hintsUsed)")
        }
        .padding(Theme.spacing12)
        .cardStyle()
    }
}

struct StatBox: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(Theme.gold)
            Text(label)
                .font(.system(size: 11))
                .foregroundColor(Theme.textDim)
        }
        .frame(maxWidth: .infinity)
    }
}

struct FlowTags: View {
    let tags: [String]

    var body: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 60), alignment: .leading)],
            alignment: .leading,
            spacing: 4
        ) {
            ForEach(tags, id: \.self) { tag in
                Text(tag)
                    .font(.system(size: 11))
                    .foregroundColor(Theme.textDim)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Theme.surfaceAlt)
                    .cornerRadius(4)
            }
        }
    }
}
