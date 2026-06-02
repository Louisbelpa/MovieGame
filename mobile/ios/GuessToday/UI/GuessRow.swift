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

    @ViewBuilder
    private var statusIcon: some View {
        if isCorrect {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(Theme.green)
        } else if isSkipped {
            Image(systemName: "forward.fill")
                .foregroundColor(Theme.muted)
                .font(.system(size: 12))
        } else {
            Image(systemName: "xmark.circle.fill")
                .foregroundColor(Theme.red)
        }
    }

    private var statusColor: Color {
        if isCorrect { return Theme.green }
        if isSkipped { return Theme.muted }
        return Theme.red
    }

    private var rowBackground: Color {
        guard isUsed else { return Theme.surfaceAlt.opacity(0.3) }
        if isCorrect { return Theme.green.opacity(0.1) }
        if isSkipped { return Theme.surfaceAlt.opacity(0.5) }
        return Theme.red.opacity(0.08)
    }

    private var rowBorderColor: Color {
        guard isUsed else { return Theme.border.opacity(0.3) }
        if isCorrect { return Theme.green.opacity(0.4) }
        if isSkipped { return Theme.border.opacity(0.3) }
        return Theme.red.opacity(0.3)
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
