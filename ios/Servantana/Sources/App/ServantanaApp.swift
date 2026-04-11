import SwiftUI

@main
struct ServantanaApp: App {
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(appState)
        }
    }
}

class AppState: ObservableObject {
    @Published var selectedTab: Tab = .home

    enum Tab: Int, CaseIterable {
        case home, search, bookings, messages, profile
    }
}
