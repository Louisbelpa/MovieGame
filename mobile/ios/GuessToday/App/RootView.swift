import SwiftUI
import UserNotifications

struct RootView: View {
    @Environment(AuthViewModel.self) var auth
    @State private var selectedTab: AppTab = .home

    var body: some View {
        ZStack {
            if auth.isCheckingSession {
                SplashView()
                    .transition(.opacity)
                    .zIndex(1)
            } else {
                mainTabView
                    .onAppear { requestNotificationPermission() }
                    .transition(.opacity)
                    .zIndex(0)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: auth.isCheckingSession)
    }

    private var mainTabView: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem { Label("Jouer", systemImage: "gamecontroller") }
                .tag(AppTab.home)

            NavigationStack {
                FriendsView()
            }
            .tabItem { Label("Amis", systemImage: "person.2") }
            .tag(AppTab.friends)

            ArchiveView()
                .tabItem { Label("Historique", systemImage: "calendar") }
                .tag(AppTab.archive)

            ProfileView()
                .tabItem { Label("Profil", systemImage: "person.circle") }
                .tag(AppTab.profile)
        }
        .tint(Theme.gold)
        .background(Theme.background)
        // Force dark tab bar
        .onAppear {
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(Theme.surface)
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }

    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }
}

enum AppTab: Hashable {
    case home, friends, archive, profile
}

struct SplashView: View {
    @State private var appeared = false
    @State private var showDot = false

    var body: some View {
        ZStack {
            Theme.background.ignoresSafeArea()
            VStack(spacing: Theme.spacing12) {
                Text("GT")
                    .font(.custom("Georgia", size: 54))
                    .fontWeight(.bold)
                    .foregroundColor(Theme.gold)
                    .scaleEffect(appeared ? 1 : 0.55)
                    .opacity(appeared ? 1 : 0)

                Text("GuessToday")
                    .font(.system(size: 14, weight: .medium, design: .default))
                    .foregroundColor(Theme.textDim)
                    .tracking(3)
                    .textCase(.uppercase)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 8)

                ProgressView()
                    .tint(Theme.gold)
                    .scaleEffect(0.8)
                    .opacity(showDot ? 1 : 0)
                    .padding(.top, Theme.spacing8)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.68).delay(0.05)) {
                appeared = true
            }
            withAnimation(.easeIn(duration: 0.3).delay(0.45)) {
                showDot = true
            }
        }
    }
}
