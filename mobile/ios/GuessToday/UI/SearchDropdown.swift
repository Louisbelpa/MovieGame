import SwiftUI

struct SearchDropdown: View {
    let results: [SearchResultItem]
    let onSelect: (SearchResultItem) -> Void

    var body: some View {
        VStack(spacing: 0) {
            ForEach(results.indices, id: \.self) { i in
                let item = results[i]
                Button {
                    onSelect(item)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.title)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Theme.text)
                            if let year = item.year {
                                Text("\(year)")
                                    .font(.system(size: 12))
                                    .foregroundColor(Theme.textDim)
                            }
                        }
                        Spacer()
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(Color.clear)
                }
                if i < results.count - 1 {
                    Divider()
                        .background(Theme.border)
                        .padding(.leading, 14)
                }
            }
        }
        .background(Theme.surfaceAlt)
        .cornerRadius(Theme.radiusM)
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusM)
                .stroke(Theme.border, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 4)
    }
}
