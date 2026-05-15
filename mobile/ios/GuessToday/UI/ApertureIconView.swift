import SwiftUI

/// Aperture logo mark — 6-blade camera diaphragm in gold gradient on dark radial background.
/// `openAmount` (0 = closed pinwheel, 1 = fully open) drives the iris animation:
/// each blade pivots around its outer tip, sweeping inward to close the aperture.
struct ApertureIconView: View {
    var size: CGFloat = 22
    var showBackground: Bool = false
    var cornerRadius: CGFloat? = nil
    /// 0 = iris closed (blades folded in, covering center), 1 = fully open
    var openAmount: Double = 1.0

    private var effectiveRadius: CGFloat {
        cornerRadius ?? size * 0.22
    }

    // Rotate a point around a pivot in 2D (screen coordinates).
    private func rotate(_ pt: CGPoint, around pivot: CGPoint, by angle: CGFloat) -> CGPoint {
        let dx = pt.x - pivot.x
        let dy = pt.y - pivot.y
        return CGPoint(
            x: pivot.x + dx * cos(angle) - dy * sin(angle),
            y: pivot.y + dx * sin(angle) + dy * cos(angle)
        )
    }

    var body: some View {
        Canvas { ctx, sz in
            let cx = sz.width / 2
            let cy = sz.height / 2
            let r: CGFloat = sz.width * 0.293
            let rInner: CGFloat = sz.width * 0.254

            if showBackground {
                let bgPath = Path(roundedRect: CGRect(origin: .zero, size: sz),
                                  cornerRadius: effectiveRadius)
                ctx.fill(bgPath, with: .linearGradient(
                    Gradient(colors: [Color(hex: "#3a2d18"), Color(hex: "#070605")]),
                    startPoint: CGPoint(x: cx, y: 0),
                    endPoint: CGPoint(x: cx, y: sz.height)
                ))
            }

            let goldGrad = GraphicsContext.Shading.linearGradient(
                Gradient(colors: [Color(hex: "#fcd982"), Color(hex: "#a47225")]),
                startPoint: CGPoint(x: cx, y: cy - r),
                endPoint: CGPoint(x: cx, y: cy + r)
            )

            // When closed, each blade pivots -60° (CCW) around its tip so its base
            // sweeps to the adjacent tip — blades interlock and cover the center.
            let closeAngle = CGFloat(-(1.0 - openAmount) * .pi / 3)

            for i in 0..<6 {
                let tipAngle = Double(i) * .pi / 3 - .pi / 2
                let tip = CGPoint(
                    x: cx + CGFloat(cos(tipAngle)) * r,
                    y: cy + CGFloat(sin(tipAngle)) * r
                )
                // Right corner in the fully-open position
                let rightAngle = tipAngle + .pi / 3
                let rightOpen = CGPoint(
                    x: cx + CGFloat(cos(rightAngle)) * rInner,
                    y: cy + CGFloat(sin(rightAngle)) * rInner
                )
                // Rotate both base points around the tip
                let centerFinal = rotate(CGPoint(x: cx, y: cy), around: tip, by: closeAngle)
                let rightFinal  = rotate(rightOpen,              around: tip, by: closeAngle)

                var blade = Path()
                blade.move(to: tip)
                blade.addLine(to: rightFinal)
                blade.addLine(to: centerFinal)
                blade.closeSubpath()
                ctx.fill(blade, with: goldGrad)
                ctx.stroke(blade,
                           with: .color(Color(hex: "#15110a")),
                           lineWidth: sz.width * 0.008)
            }

            // Center hole — shrinks away when iris closes
            let holeR = sz.width * 0.035 * CGFloat(max(0.05, openAmount))
            ctx.fill(Path(ellipseIn: CGRect(x: cx - holeR, y: cy - holeR,
                                            width: holeR * 2, height: holeR * 2)),
                     with: .color(Color(hex: "#15110a")))

            let dotR = sz.width * 0.012 * CGFloat(max(0.05, openAmount))
            ctx.fill(Path(ellipseIn: CGRect(x: cx - dotR, y: cy - dotR,
                                            width: dotR * 2, height: dotR * 2)),
                     with: goldGrad)
        }
        .frame(width: size, height: size)
        .clipShape(showBackground ? AnyShape(RoundedRectangle(cornerRadius: effectiveRadius)) : AnyShape(Rectangle()))
    }
}

/// Horizontal lockup: aperture icon + "Guess·today" wordmark
struct ApertureLockup: View {
    var iconSize: CGFloat = 22
    var fontSize: CGFloat = 20

    var body: some View {
        HStack(spacing: 8) {
            ApertureIconView(size: iconSize)
            Text("Guess").font(.custom("Fraunces", size: fontSize)).fontWeight(.medium).foregroundColor(Theme.text)
            + Text("today").font(.custom("Fraunces", size: fontSize)).italic().foregroundStyle(
                LinearGradient(colors: [Color(hex: "#f0c870"), Color(hex: "#8a5e1f")],
                               startPoint: .top, endPoint: .bottom)
            )
        }
    }
}

#Preview("Mark") {
    HStack(spacing: 24) {
        ApertureIconView(size: 22)
        ApertureIconView(size: 44)
        ApertureIconView(size: 80, showBackground: true, cornerRadius: 18)
        ApertureIconView(size: 120, showBackground: true)
    }
    .padding(32)
    .background(Color(hex: "#0a0d12"))
}

#Preview("Lockup") {
    ApertureLockup()
        .padding(32)
        .background(Color(hex: "#0a0d12"))
}
