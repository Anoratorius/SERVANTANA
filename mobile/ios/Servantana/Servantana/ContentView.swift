import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        Group {
            switch authManager.authState {
            case .loading:
                SplashView()
            case .authenticated:
                MainTabView()
            case .unauthenticated:
                AuthView()
            }
        }
        .animation(.easeInOut, value: authManager.authState)
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.accentColor
                .ignoresSafeArea()

            VStack(spacing: 16) {
                Text("Servantana")
                    .font(.system(size: 42, weight: .bold))
                    .foregroundColor(.white)

                Text("Professional Services Marketplace")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))

                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .padding(.top, 32)
            }
        }
    }
}

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(0)

            SearchView()
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }
                .tag(1)

            BookingsView()
                .tabItem {
                    Label("Bookings", systemImage: "calendar")
                }
                .tag(2)

            MessagesView()
                .tabItem {
                    Label("Messages", systemImage: "message.fill")
                }
                .tag(3)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.fill")
                }
                .tag(4)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager())
}
