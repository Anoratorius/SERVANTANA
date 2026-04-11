import Foundation
import UserNotifications
import UIKit

@MainActor
class NotificationManager: NSObject, ObservableObject {
    static let shared = NotificationManager()

    @Published var isAuthorized = false
    @Published var deviceToken: String?
    @Published var pendingNotification: PushNotification?

    private override init() {
        super.init()
    }

    // MARK: - Permission Request

    func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            isAuthorized = granted

            if granted {
                await registerForRemoteNotifications()
            }

            return granted
        } catch {
            print("Notification authorization error: \(error)")
            return false
        }
    }

    func checkAuthorizationStatus() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        isAuthorized = settings.authorizationStatus == .authorized
    }

    // MARK: - Remote Notifications

    private func registerForRemoteNotifications() async {
        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func handleDeviceToken(_ tokenData: Data) {
        let token = tokenData.map { String(format: "%02.2hhx", $0) }.joined()
        deviceToken = token

        Task {
            await registerTokenWithServer(token)
        }
    }

    func handleRegistrationError(_ error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }

    // MARK: - Server Registration

    private func registerTokenWithServer(_ token: String) async {
        do {
            let deviceName = await UIDevice.current.name
            let deviceModel = await UIDevice.current.model
            let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String

            struct RegisterRequest: Encodable {
                let token: String
                let platform: String
                let deviceName: String?
                let deviceModel: String?
                let appVersion: String?
            }

            struct RegisterResponse: Decodable {
                let success: Bool
                let tokenId: String?
            }

            let request = RegisterRequest(
                token: token,
                platform: "ios",
                deviceName: deviceName,
                deviceModel: deviceModel,
                appVersion: appVersion
            )

            let _: RegisterResponse = try await APIClient.shared.request(
                "/user/notifications/push/mobile",
                method: "POST",
                body: request
            )

            print("Device token registered successfully")
        } catch {
            print("Failed to register device token: \(error)")
        }
    }

    // MARK: - Notification Handling

    func handleNotification(_ userInfo: [AnyHashable: Any], completion: @escaping () -> Void) {
        guard let notification = parseNotification(userInfo) else {
            completion()
            return
        }

        pendingNotification = notification
        completion()
    }

    func handleNotificationTap(_ userInfo: [AnyHashable: Any]) {
        guard let notification = parseNotification(userInfo) else { return }

        // Handle navigation based on notification type
        handleNotificationNavigation(notification)
    }

    private func parseNotification(_ userInfo: [AnyHashable: Any]) -> PushNotification? {
        guard let aps = userInfo["aps"] as? [String: Any],
              let alert = aps["alert"] as? [String: Any] else {
            return nil
        }

        let title = alert["title"] as? String ?? ""
        let body = alert["body"] as? String ?? ""
        let type = userInfo["type"] as? String
        let bookingId = userInfo["bookingId"] as? String
        let url = userInfo["url"] as? String

        return PushNotification(
            title: title,
            body: body,
            type: type,
            bookingId: bookingId,
            url: url
        )
    }

    private func handleNotificationNavigation(_ notification: PushNotification) {
        // Post notification for app to handle navigation
        NotificationCenter.default.post(
            name: .pushNotificationTapped,
            object: nil,
            userInfo: ["notification": notification]
        )
    }

    // MARK: - Badge Management

    func clearBadge() async {
        await MainActor.run {
            UIApplication.shared.applicationIconBadgeNumber = 0
        }

        let center = UNUserNotificationCenter.current()
        await center.setBadgeCount(0)
    }

    // MARK: - Unregister

    func unregisterToken() async {
        guard let token = deviceToken else { return }

        do {
            struct EmptyResponse: Decodable {}
            let _: EmptyResponse = try await APIClient.shared.request(
                "/user/notifications/push/mobile?token=\(token)",
                method: "DELETE"
            )
            deviceToken = nil
        } catch {
            print("Failed to unregister token: \(error)")
        }
    }
}

// MARK: - Models

struct PushNotification {
    let title: String
    let body: String
    let type: String?
    let bookingId: String?
    let url: String?
}

// MARK: - Notification Names

extension Notification.Name {
    static let pushNotificationTapped = Notification.Name("pushNotificationTapped")
}

// MARK: - UNUserNotificationCenterDelegate

extension NotificationManager: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .badge, .sound])
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo

        Task { @MainActor in
            NotificationManager.shared.handleNotificationTap(userInfo)
            completionHandler()
        }
    }
}
