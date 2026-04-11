import SwiftUI
import UserNotifications

@main
struct ServantanaApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var appState = AppState()
    @StateObject private var notificationManager = NotificationManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(appState)
                .environmentObject(notificationManager)
                .onReceive(NotificationCenter.default.publisher(for: .pushNotificationTapped)) { notification in
                    handleNotificationTap(notification)
                }
                .task {
                    await setupNotifications()
                }
        }
    }

    private func setupNotifications() async {
        // Check current status
        await notificationManager.checkAuthorizationStatus()

        // Request permission if authenticated
        if authManager.isAuthenticated && !notificationManager.isAuthorized {
            _ = await notificationManager.requestAuthorization()
        }
    }

    private func handleNotificationTap(_ notification: Notification) {
        guard let pushNotification = notification.userInfo?["notification"] as? PushNotification else {
            return
        }

        // Navigate based on notification type
        switch pushNotification.type {
        case "BOOKING_CREATED", "BOOKING_CONFIRMED", "BOOKING_CANCELLED", "BOOKING_COMPLETED", "BOOKING_REMINDER":
            appState.selectedTab = .bookings
        case "MESSAGE_RECEIVED":
            appState.selectedTab = .messages
        case "PAYMENT_RECEIVED", "REVIEW_RECEIVED":
            appState.selectedTab = .profile
        default:
            break
        }
    }
}

// MARK: - AppDelegate for Push Notifications

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Set notification delegate
        UNUserNotificationCenter.current().delegate = NotificationManager.shared
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            NotificationManager.shared.handleDeviceToken(deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Task { @MainActor in
            NotificationManager.shared.handleRegistrationError(error)
        }
    }
}

// MARK: - AppState

class AppState: ObservableObject {
    @Published var selectedTab: Tab = .home

    enum Tab: Int, CaseIterable {
        case home, search, bookings, messages, profile
    }
}
