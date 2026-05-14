import SwiftUI

@Observable
@MainActor
final class ArchiveViewModel {
    var filmDates: [String] = []
    var seriesDates: [String] = []
    var wikiDates: [String] = []
    var isLoading = false
    var selectedMode: GameMode = .film

    var displayedDates: [String] {
        switch selectedMode {
        case .wiki:   return wikiDates
        case .series: return seriesDates
        default:      return filmDates
        }
    }

    // History from UserDefaults
    func outcome(for date: String, mode: GameMode) -> String? {
        let key = "history_\(mode.statsKey)"
        guard let data = UserDefaults.standard.dictionary(forKey: key) as? [String: String] else { return nil }
        return data[date]
    }

    func load() async {
        isLoading = true
        async let film   = loadFilmDates()
        async let series = loadSeriesDates()
        async let wiki   = loadWikiDates()
        filmDates   = (try? await film) ?? []
        seriesDates = (try? await series) ?? []
        wikiDates   = (try? await wiki) ?? []
        isLoading = false
    }

    private func loadFilmDates() async throws -> [String] {
        try await APIClient.shared.challengeDates(days: 365, type: "film")
    }

    private func loadSeriesDates() async throws -> [String] {
        try await APIClient.shared.challengeDates(days: 365, type: "series")
    }

    private func loadWikiDates() async throws -> [String] {
        try await APIClient.shared.wikiDates(days: 365)
    }

    // Group dates by month
    var datesByMonth: [(month: String, dates: [String])] {
        let sorted = displayedDates.sorted(by: >)
        var groups: [(month: String, dates: [String])] = []
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.locale = Locale(identifier: "fr_FR")
        let mf = DateFormatter()
        mf.dateFormat = "MMMM yyyy"
        mf.locale = Locale(identifier: "fr_FR")

        for date in sorted {
            guard let d = df.date(from: date) else { continue }
            let month = mf.string(from: d).capitalized
            if let idx = groups.firstIndex(where: { $0.month == month }) {
                groups[idx].dates.append(date)
            } else {
                groups.append((month: month, dates: [date]))
            }
        }
        return groups
    }
}

struct ArchiveView: View {
    @State private var vm = ArchiveViewModel()
    @State private var selectedDate: String?
    @State private var showGame = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.background.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Mode tabs
                    HStack(spacing: 0) {
                        ForEach([GameMode.film, .series, .wiki], id: \.title) { mode in
                            Button(mode.title) { vm.selectedMode = mode }
                                .font(.system(size: 14, weight: vm.selectedMode == mode ? .semibold : .regular))
                                .foregroundColor(vm.selectedMode == mode ? Theme.gold : Theme.textDim)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .overlay(alignment: .bottom) {
                                    if vm.selectedMode == mode {
                                        Rectangle().fill(Theme.gold).frame(height: 2)
                                    }
                                }
                        }
                    }
                    .background(Theme.surface)

                    if vm.isLoading {
                        Spacer()
                        ProgressView().tint(Theme.gold)
                        Spacer()
                    } else if vm.displayedDates.isEmpty {
                        Spacer()
                        Text("Aucun défi disponible")
                            .font(.system(size: 14))
                            .foregroundColor(Theme.textDim)
                        Spacer()
                    } else {
                        List {
                            ForEach(vm.datesByMonth, id: \.month) { group in
                                Section(group.month) {
                                    ForEach(group.dates, id: \.self) { date in
                                        ArchiveDateRow(
                                            date: date,
                                            outcome: vm.outcome(for: date, mode: vm.selectedMode)
                                        ) {
                                            selectedDate = date
                                            showGame = true
                                        }
                                    }
                                }
                            }
                        }
                        .listStyle(.plain)
                        .scrollContentBackground(.hidden)
                        .background(Theme.background)
                    }
                }
            }
            .navigationTitle("Archive")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Theme.background, for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .task { await vm.load() }
            .sheet(isPresented: $showGame) {
                if let date = selectedDate {
                    ArchivedGameView(date: date, mode: vm.selectedMode)
                }
            }
        }
    }
}

private struct ArchiveDateRow: View {
    let date: String
    let outcome: String?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: Theme.spacing12) {
                // Outcome indicator
                Circle()
                    .fill(outcomeColor)
                    .frame(width: 10, height: 10)

                Text(formattedDate)
                    .font(.system(size: 14))
                    .foregroundColor(Theme.text)

                Spacer()

                if let outcome {
                    Text(outcome == "won" ? "✓" : "✗")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(outcome == "won" ? Theme.green : Theme.red)
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.muted)
            }
            .padding(.vertical, 4)
        }
        .listRowBackground(Theme.background)
        .listRowSeparatorTint(Theme.border)
    }

    private var outcomeColor: Color {
        switch outcome {
        case "won":  return Theme.green
        case "lost": return Theme.red
        default:     return Theme.muted.opacity(0.4)
        }
    }

    private var formattedDate: String {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.locale = Locale(identifier: "fr_FR")
        guard let d = df.date(from: date) else { return date }
        df.dateStyle = .full
        df.timeStyle = .none
        return df.string(from: d).capitalized
    }
}

// Archived game presented as a modal
struct ArchivedGameView: View {
    let date: String
    let mode: GameMode
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            GameView(mode: mode, initialDate: date)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Fermer") { dismiss() }
                            .foregroundColor(Theme.textDim)
                    }
                }
        }
    }
}
