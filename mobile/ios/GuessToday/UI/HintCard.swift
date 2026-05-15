import SwiftUI

struct HintCard: View {
    let hint: HintItem
    let isNew: Bool
    var staggerDelay: Double = 0

    @State private var appeared = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(hint.displayLabel)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(Theme.gold)
                .textCase(.uppercase)
                .tracking(0.8)

            if hint.isSynopsis {
                Text(hint.value.displayText)
                    .font(.system(size: 13))
                    .foregroundColor(Theme.text)
                    .lineLimit(4)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Text(hint.value.displayText)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.text)
                    .lineLimit(2)
            }
        }
        .padding(Theme.spacing12)
        .frame(maxWidth: .infinity, alignment: .leading)
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
        HStack(spacing: 8) {
            Image(systemName: "lock.fill")
                .font(.system(size: 12))
                .foregroundColor(Theme.muted)
            Text("Indice \(index + 1)")
                .font(.system(size: 13))
                .foregroundColor(Theme.muted)
            Spacer()
        }
        .padding(Theme.spacing12)
        .background(Theme.surfaceAlt.opacity(0.5))
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(Theme.border.opacity(0.4), lineWidth: 1)
        )
    }
}

struct HintsGrid: View {
    let hints: [HintItem]
    let hintsAvailable: Int
    let hintsRevealed: Int
    let previousRevealCount: Int

    private var lockedCount: Int {
        max(0, hintsAvailable - hintsRevealed)
    }

    private var regularIndices: [Int] { hints.indices.filter { !hints[$0].isSynopsis } }
    private var synopsisIndices: [Int] { hints.indices.filter { hints[$0].isSynopsis } }

    var body: some View {
        VStack(spacing: Theme.spacing8) {
            if !regularIndices.isEmpty || lockedCount > 0 {
                LazyVGrid(
                    columns: [GridItem(.flexible()), GridItem(.flexible())],
                    spacing: Theme.spacing8
                ) {
                    ForEach(regularIndices, id: \.self) { i in
                        let isNew = i >= previousRevealCount
                        HintCard(
                            hint: hints[i],
                            isNew: isNew,
                            staggerDelay: isNew ? Double(i - previousRevealCount) * 0.09 : 0
                        )
                    }
                    ForEach(0..<lockedCount, id: \.self) { i in
                        LockedHintCard(index: hintsRevealed + i)
                    }
                }
            }

            ForEach(synopsisIndices, id: \.self) { i in
                let isNew = i >= previousRevealCount
                HintCard(
                    hint: hints[i],
                    isNew: isNew,
                    staggerDelay: isNew ? Double(i - previousRevealCount) * 0.09 : 0
                )
            }
        }
    }
}
