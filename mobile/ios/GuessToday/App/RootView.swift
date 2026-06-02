import SwiftUI

// ─── Root ─────────────────────────────────────────────────────────────────────

struct RootView: View {
    @Environment(AuthViewModel.self) var auth
    @Environment(DeepLinkRouter.self) var router
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @ObservedObject private var network = NetworkMonitor.shared
    @State private var selectedTab: AppTab = .home
    private let tabHaptic = UISelectionFeedbackGenerator()
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    // Splash dismisses when BOTH auth check is done AND the Lottie animation has finished.
    @State private var showSplash = true
    @State private var animationFinished = false
    @State private var authReady = false

    var body: some View {
        ZStack {
            // Content always rendered so it's visible through the fading splash.
            if !hasSeenOnboarding {
                OnboardingView {
                    withAnimation(.easeInOut(duration: 0.4)) { hasSeenOnboarding = true }
                }
                .zIndex(0)
            } else {
                mainTabView
                    .zIndex(0)
            }

            if showSplash {
                SplashView(onComplete: dismiss)
                    .transition(.opacity)
                    .zIndex(2)
            }
        }
        .animation(.easeInOut(duration: 0.42), value: showSplash)
        .animation(.easeInOut(duration: 0.35), value: hasSeenOnboarding)
        .onChange(of: auth.isCheckingSession) { _, isChecking in
            guard !isChecking, showSplash else { return }
            authReady = true
            if reduceMotion { showSplash = false; return }
            tryDismiss()
        }
    }

    private func dismiss() {
        animationFinished = true
        tryDismiss()
    }

    private func tryDismiss() {
        guard animationFinished && authReady else { return }
        showSplash = false
    }

    private var mainTabView: some View {
        VStack(spacing: 0) {
            if !network.isConnected {
                OfflineBanner()
                    .transition(.move(edge: .top).combined(with: .opacity))
            }

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
        }
        .animation(.easeInOut(duration: 0.25), value: network.isConnected)
        .onChange(of: selectedTab) { _, _ in tabHaptic.selectionChanged() }
        .onChange(of: router.trigger) { _, _ in
            if router.pendingMode != nil { selectedTab = .home }
        }
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

// ─── Splash (Lottie) ──────────────────────────────────────────────────────────

import Lottie

struct SplashView: View {
    let onComplete: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var opacity: Double = 1
    @State private var wordmarkVisible = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()

            if reduceMotion {
                VStack(spacing: 20) {
                    ApertureIconView(size: 100)
                    HStack(spacing: 0) {
                        Text("Guess")
                            .font(Theme.fraunces(size: 30))
                            .foregroundColor(Theme.text)
                        Text("today")
                            .font(Theme.fraunces(size: 30, italic: true))
                            .foregroundStyle(LinearGradient(
                                colors: [Theme.goldLight, Theme.gold],
                                startPoint: .top, endPoint: .bottom))
                    }
                }
                .onAppear {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { fadeOut() }
                }
            } else {
                VStack(spacing: 28) {
                    // Lottie: blades spin 0–1.5s, static 1.5–2.5s — no animationDidFinish
                    // (that callback races with wordmark timer and can fade before wordmark shows)
                    LottieView(animation: .named("aperture-splash"))
                        .playing(loopMode: .playOnce)
                        .frame(width: 260, height: 260)

                    HStack(spacing: 0) {
                        Text("Guess")
                            .font(Theme.fraunces(size: 34))
                            .foregroundColor(Theme.text)
                        Text("today")
                            .font(Theme.fraunces(size: 34, italic: true))
                            .foregroundStyle(LinearGradient(
                                colors: [Theme.goldLight, Theme.gold],
                                startPoint: .top, endPoint: .bottom))
                    }
                    .opacity(wordmarkVisible ? 1 : 0)
                    .offset(y: wordmarkVisible ? 0 : 10)
                    .animation(.easeOut(duration: 0.5), value: wordmarkVisible)
                }
                .onAppear {
                    // Wordmark slides in as blades settle (frame 90 = 1.5s)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        wordmarkVisible = true
                    }
                    // Fade out after wordmark has been readable for ~1s
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.8) {
                        fadeOut()
                    }
                }
            }
        }
        .opacity(opacity)
    }

    private func fadeOut() {
        withAnimation(.easeInOut(duration: 0.4)) { opacity = 0 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { onComplete() }
    }
}
