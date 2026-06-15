import SwiftUI

struct GuessRow: View {
    let attempt: AttemptEntry?
    let index: Int
    let maxAttempts: Int

    private var isUsed: Bool { attempt != nil }
    private var isCorrect: Bool { attempt?.correct == true }
    private var isSkipped: Bool { attempt?.guess.isEmpty == true }

    var body: some View {
        HStack(spacing: 12) {
            // Slot number
            Text("\(index + 1)")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(isUsed ? statusColor : Theme.muted)
                .frame(width: 22)

            if let attempt {
                // Guess text
                Text(attempt.guess.isEmpty ? "Passé" : attempt.guess)
                    .font(.system(size: 14))
                    .foregroundColor(attempt.guess.isEmpty ? Theme.textDim : Theme.text)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)

                // Status icon
                statusIcon
            } else {
                // Empty slot
                RoundedRectangle(cornerRadius: 3)
                    .fill(Theme.surfaceAlt)
                    .frame(height: 2)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(rowBackground)
        .cornerRadius(Theme.radiusS)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusS)
                .stroke(rowBorderColor, lineWidth: 1)
        )
    }

    // Pastille circulaire (icône blanche sur fond couleur) — signature Candy.
    @ViewBuilder
    private var statusIcon: some View {
        ZStack {
            Circle().fill(pastilleColor).frame(width: 20, height: 20)
            Image(systemName: pastilleGlyph)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(.white)
        }
    }

    private var pastilleColor: Color {
        if isCorrect { return Theme.correct }
        if isSkipped { return Theme.ink3 }
        return Theme.wrong
    }
    private var pastilleGlyph: String {
        if isCorrect { return "checkmark" }
        if isSkipped { return "arrow.right" }
        return "xmark"
    }

    private var statusColor: Color {
        if isCorrect { return Theme.correctDark }
        if isSkipped { return Theme.ink2 }
        return Theme.wrongDark
    }

    private var rowBackground: Color {
        guard isUsed else { return Theme.surfaceAlt }
        if isCorrect { return Theme.correctSoft }
        if isSkipped { return Color(hex: "#f1ece6") }
        return Theme.wrongSoft
    }

    private var rowBorderColor: Color {
        guard isUsed else { return Theme.line }
        if isCorrect { return Theme.correct.opacity(0.4) }
        if isSkipped { return Theme.line }
        return Theme.wrong.opacity(0.4)
    }
}

struct AttemptTracker: View {
    let attemptsUsed: Int
    let maxAttempts: Int

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<maxAttempts, id: \.self) { i in
                Circle()
                    .fill(i < attemptsUsed ? Theme.red : Theme.surfaceAlt)
                    .frame(width: 8, height: 8)
            }
            Spacer()
            Text("\(maxAttempts - attemptsUsed) tentative\(maxAttempts - attemptsUsed > 1 ? "s" : "") restante\(maxAttempts - attemptsUsed > 1 ? "s" : "")")
                .font(.system(size: 12))
                .foregroundColor(Theme.textDim)
        }
    }
}
