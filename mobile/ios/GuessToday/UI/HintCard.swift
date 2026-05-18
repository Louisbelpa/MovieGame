import SwiftUI

struct HintCard: View {
    let hint: HintItem
    let isNew: Bool
    var staggerDelay: Double = 0

    @State private var appeared = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(hint.displayLabel)
                .font(Theme.inter(size: 10, weight: .semibold))
                .foregroundColor(Theme.gold)
                .textCase(.uppercase)
                .tracking(0.8)

            if hint.isSynopsis {
                Text(hint.value.displayText)
                    .font(Theme.inter(size: 13))
                    .foregroundColor(Theme.text)
                    .lineLimit(4)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text(hint.value.displayText)
                    .font(Theme.inter(size: 14, weight: .medium))
                    .foregroundColor(Theme.text)
                    .lineLimit(2)
            }
        }
        .padding(Theme.spacing12)
        .frame(maxWidth: .infinity, minHeight: 64, maxHeight: .infinity, alignment: .leading)
        .background(Theme.surface)
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(isNew ? Theme.gold.opacity(0.6) : Theme.border, lineWidth: 1)
        )
        .scaleEffect(appeared ? 1 : 0.92)
        .opacity(appeared ? 1 : 0)
        .onAppear {
            withAnimation(.spring(response: 0.38, dampingFraction: 0.7).delay(staggerDelay)) {
                appeared = true
            }
        }
    }
}

struct LockedHintCard: View {
    let index: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Indice \(index)")
                .font(Theme.inter(size: 10, weight: .semibold))
                .foregroundColor(.white.opacity(0.25))
                .textCase(.uppercase)
                .tracking(0.8)
            Spacer(minLength: 4)
            Image(systemName: "lock.fill")
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.30))
        }
        .padding(Theme.spacing12)
        .frame(maxWidth: .infinity, minHeight: 64, maxHeight: .infinity, alignment: .leading)
        .background(Color.clear)
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(
                    Color.white.opacity(0.18),
                    style: StrokeStyle(lineWidth: 1, dash: [5, 4])
                )
        )
    }
}

struct HintsGrid: View {
    let hints: [HintItem]
    let hintsAvailable: Int
    let hintsRevealed: Int
    let previousRevealCount: Int

    private var lockedCount: Int { max(0, hintsAvailable - hintsRevealed) }

    private enum GridItem: Identifiable {
        case revealed(index: Int)
        case locked(slot: Int)
        var id: String {
            switch self {
            case .revealed(let i): return "revealed_\(i)"
            case .locked(let s):   return "locked_\(s)"
            }
        }
    }

    private var regularHints: [HintItem]  { hints.filter { !$0.isSynopsis } }
    private var synopsisHints: [HintItem] { hints.filter { $0.isSynopsis } }

    private var gridItems: [GridItem] {
        let revealed = regularHints.indices.map { GridItem.revealed(index: $0) }
        let locked   = (0..<lockedCount).map { GridItem.locked(slot: $0) }
        return revealed + locked
    }

    var body: some View {
        VStack(spacing: Theme.spacing8) {
            if !gridItems.isEmpty {
                LazyVGrid(
                    columns: [SwiftUI.GridItem(.flexible()), SwiftUI.GridItem(.flexible()), SwiftUI.GridItem(.flexible())],
                    spacing: Theme.spacing8
                ) {
                    ForEach(gridItems) { item in
                        switch item {
                        case .revealed(let i):
                            let isNew = i >= previousRevealCount
                            HintCard(
                                hint: regularHints[i],
                                isNew: isNew,
                                staggerDelay: isNew ? Double(i - previousRevealCount) * 0.09 : 0
                            )
                        case .locked(let slot):
                            LockedHintCard(index: hintsRevealed + slot + 1)
                        }
                    }
                }
            }

            ForEach(Array(synopsisHints.enumerated()), id: \.offset) { i, hint in
                let isNew = (regularHints.count + i) >= previousRevealCount
                HintCard(
                    hint: hint,
                    isNew: isNew,
                    staggerDelay: isNew ? Double((regularHints.count + i) - previousRevealCount) * 0.09 : 0
                )
            }
        }
    }
}
