import SwiftUI

// ─── Root ─────────────────────────────────────────────────────────────────────

struct RootView: View {
    @Environment(AuthViewModel.self) var auth
    @State private var selectedTab: AppTab = .home
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    // 0 = iris fully closed, 1 = fully open.
    // Driven linearly so per-blade smoothstep inside SplashView handles each petal's easing.
    @State private var irisProgress: Double = 0
    @State private var showSplash = true

    var body: some View {
        ZStack {
            if !showSplash {
                if !hasSeenOnboarding {
                    OnboardingView {
                        withAnimation(.easeInOut(duration: 0.4)) { hasSeenOnboarding = true }
                    }
                    .transition(.opacity)
                    .zIndex(1)
                } else {
                    mainTabView
                        .transition(.opacity)
                        .zIndex(0)
                }
            }

            if showSplash {
                SplashView(progress: irisProgress)
                    .transition(.opacity)
                    .zIndex(2)
            }
        }
        .animation(.easeInOut(duration: 0.42), value: showSplash)
        .animation(.easeInOut(duration: 0.35), value: hasSeenOnboarding)
        .onAppear {
            // Linear driver — per-blade easing is baked into SplashView
            withAnimation(.linear(duration: 1.8).delay(0.25)) {
                irisProgress = 1.0
            }
        }
        .onChange(of: auth.isCheckingSession) { _, isChecking in
            guard !isChecking, showSplash else { return }
            // Wait for the opening to finish before closing
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                withAnimation(.easeIn(duration: 0.5)) { irisProgress = 0 }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.58) { showSplash = false }
            }
        }
    }

    private var mainTabView: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem { Label("Jouer", systemImage: "gamecontroller") }
                .tag(AppTab.home)
            NavigationStack { FriendsView() }
                .tabItem { Label("Amis", systemImage: "person.2") }
                .tag(AppTab.friends)
            ProfileView()
                .tabItem { Label("Profil", systemImage: "person.circle") }
                .tag(AppTab.profile)
        }
        .tint(Theme.gold)
        .background(Theme.background)
        .onAppear {
            let a = UITabBarAppearance()
            a.configureWithOpaqueBackground()
            a.backgroundColor = UIColor(Theme.surface)
            UITabBar.appearance().standardAppearance = a
            UITabBar.appearance().scrollEdgeAppearance = a
        }
    }
}

enum AppTab: Hashable { case home, friends, profile }

// ─── Splash ───────────────────────────────────────────────────────────────────

struct SplashView: View {
    let progress: Double

    @State private var wordmarkOffset: CGFloat = 14
    @State private var wordmarkOpacity: Double = 0

    // Smoothstep easing for blade i, given the global linear progress.
    // Each blade has a staggered start so they bloom one after another.
    private func petalScale(_ i: Int) -> Double {
        let start    = Double(i) * 0.12   // blade i starts at 12 % intervals
        let duration = 0.30               // each petal takes 30 % of the timeline
        let raw = (progress - start) / duration
        let x   = max(0.0, min(1.0, raw))
        return x * x * (3.0 - 2.0 * x)  // smoothstep
    }

    private var irisView: some View {
        let scales = (0..<6).map { petalScale($0) }

        return Canvas { ctx, sz in
            let cx = sz.width  / 2
            let cy = sz.height / 2
            let r: CGFloat    = sz.width * 0.44   // outer petal radius
            let gap: CGFloat  = 0.048             // angular gap each side (≈ 2.75°)
            let bulge: CGFloat = 1.062            // how much the outer arc bulges

            for i in 0..<6 {
                let s = CGFloat(scales[i])
                guard s > 0 else { continue }

                let axis      = Double(i) * .pi / 3 - .pi / 2  // blade pointing angle
                let halfSpan  = CGFloat(Double.pi / 3) - gap

                // Petal points in fully-open position
                let tipPt   = CGPoint(x: cx + r * cos(axis), y: cy + r * sin(axis))
                let leftPt  = CGPoint(x: cx + r * cos(axis - Double(halfSpan)),
                                      y: cy + r * sin(axis - Double(halfSpan)))
                let rightPt = CGPoint(x: cx + r * cos(axis + Double(halfSpan)),
                                      y: cy + r * sin(axis + Double(halfSpan)))
                // Quadratic control: pulls the outer arc outward at the blade's axis
                let ctrlPt  = CGPoint(x: cx + r * bulge * cos(axis),
                                      y: cy + r * bulge * sin(axis))

                // Bloom: scale every point from the canvas center
                func sc(_ p: CGPoint) -> CGPoint {
                    CGPoint(x: cx + (p.x - cx) * s, y: cy + (p.y - cy) * s)
                }
                let sLeft  = sc(leftPt)
                let sRight = sc(rightPt)
                let sCtrl  = sc(ctrlPt)
                let sTip   = sc(tipPt)
                let center = CGPoint(x: cx, y: cy)

                // Petal fill — metallic gold gradient per blade (tip → center)
                var petal = Path()
                petal.move(to: center)
                petal.addLine(to: sLeft)
                petal.addQuadCurve(to: sRight, control: sCtrl)
                petal.closeSubpath()

                ctx.fill(petal, with: .linearGradient(
                    Gradient(stops: [
                        .init(color: Color(hex: "#ffe490"), location: 0.00),  // bright tip
                        .init(color: Color(hex: "#d4a02a"), location: 0.38),  // gold mid
                        .init(color: Color(hex: "#7a5008"), location: 0.80),  // dark base
                        .init(color: Color(hex: "#a87018"), location: 1.00),  // warm lift
                    ]),
                    startPoint: sTip,
                    endPoint: center
                ))

                // Outer-edge highlight arc
                var arc = Path()
                arc.move(to: sLeft)
                arc.addQuadCurve(to: sRight, control: sCtrl)
                ctx.stroke(arc,
                           with: .color(Color(hex: "#fff0c0").opacity(0.38 * Double(s))),
                           lineWidth: 1.1)

                // Thin separation line on each side (gives depth between petals)
                for pt in [sLeft, sRight] {
                    var sep = Path()
                    sep.move(to: center)
                    sep.addLine(to: pt)
                    ctx.stroke(sep,
                               with: .color(Color(hex: "#100d08").opacity(0.55 * Double(s))),
                               lineWidth: 0.9)
                }
            }

            // Center hole — grows in with the last petal
            let last   = CGFloat(scales[5])
            let holeR  = r * 0.155 * last
            if holeR > 0.5 {
                let holeRect = CGRect(x: cx - holeR, y: cy - holeR,
                                      width: holeR * 2, height: holeR * 2)
                ctx.fill(Path(ellipseIn: holeRect), with: .color(Color(hex: "#0c0a07")))

                // Small gold center dot
                let dotR    = holeR * 0.30
                let dotRect = CGRect(x: cx - dotR, y: cy - dotR,
                                     width: dotR * 2, height: dotR * 2)
                ctx.fill(Path(ellipseIn: dotRect), with: .linearGradient(
                    Gradient(colors: [Color(hex: "#ffe490"), Color(hex: "#b07820")]),
                    startPoint: CGPoint(x: cx - dotR, y: cy - dotR),
                    endPoint:   CGPoint(x: cx + dotR, y: cy + dotR)
                ))
            }
        }
        .frame(width: 290, height: 290)
        // Subtle global scale + focus lift as the iris opens
        .scaleEffect(0.86 + 0.14 * progress)
        .blur(radius: CGFloat((1 - progress) * 6))
    }

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            // Warm radial glow behind the iris
            RadialGradient(
                colors: [
                    Color(hex: "#b07010").opacity(0.22),
                    Color(hex: "#6b3a08").opacity(0.08),
                    .clear,
                ],
                center: .center,
                startRadius: 20,
                endRadius: 320
            )
            .opacity(progress)
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                irisView

                // Wordmark
                HStack(spacing: 4) {
                    Text("Guess")
                        .font(.custom("Fraunces", size: 30))
                        .fontWeight(.medium)
                        .foregroundColor(Theme.text)
                    Text("today")
                        .font(.custom("Fraunces", size: 30))
                        .italic()
                        .foregroundStyle(LinearGradient(
                            colors: [Color(hex: "#f5d870"), Color(hex: "#8a5e1f")],
                            startPoint: .top,
                            endPoint: .bottom
                        ))
                }
                .padding(.top, 32)
                // Fade with iris on close; slide in on open
                .opacity(wordmarkOpacity * min(1.0, progress * 2.5))
                .offset(y: wordmarkOffset)

                Spacer()
            }
        }
        .onAppear {
            // Wordmark slides up after the last petal finishes opening
            withAnimation(.spring(response: 0.5, dampingFraction: 0.75).delay(1.75)) {
                wordmarkOpacity = 1
                wordmarkOffset  = 0
            }
        }
    }
}
