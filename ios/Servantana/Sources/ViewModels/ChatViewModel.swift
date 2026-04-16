import Foundation
import Combine

@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var otherUserName = "Chat"
    @Published var isLoading = false
    @Published var isSending = false
    @Published var error: String?
    @Published var isPolling = false

    private let userId: String
    private var pollingTask: Task<Void, Never>?
    private var cancellables = Set<AnyCancellable>()
    private let pollingInterval: TimeInterval = 3.0 // Poll every 3 seconds

    init(userId: String) {
        self.userId = userId
        Task {
            await loadMessages()
        }
        setupNotificationObserver()
    }

    deinit {
        pollingTask?.cancel()
    }

    // MARK: - Message Loading

    func loadMessages() async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.getMessages(conversationId: userId)
            let newMessages = response.messages.sorted { $0.timestamp < $1.timestamp }

            // Only update if there are new messages to avoid UI flicker
            if newMessages.count != messages.count ||
               newMessages.last?.id != messages.last?.id {
                messages = newMessages
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func sendMessage(_ content: String) async {
        isSending = true

        do {
            let request = SendMessageRequest(receiverId: userId, content: content, bookingId: nil)
            let response = try await APIClient.shared.sendMessage(request)
            messages.append(response.message)
        } catch {
            self.error = error.localizedDescription
        }

        isSending = false
    }

    // MARK: - Real-time Polling

    /// Start polling for new messages when chat view is visible
    func startPolling() {
        guard pollingTask == nil else { return }
        isPolling = true

        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(self?.pollingInterval ?? 3.0) * 1_000_000_000)
                guard !Task.isCancelled else { break }
                await self?.refreshMessages()
            }
        }
    }

    /// Stop polling when chat view disappears
    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
        isPolling = false
    }

    /// Refresh messages without showing loading state (for background updates)
    private func refreshMessages() async {
        do {
            let response = try await APIClient.shared.getMessages(conversationId: userId)
            let newMessages = response.messages.sorted { $0.timestamp < $1.timestamp }

            // Check if there are actual new messages
            if let lastNew = newMessages.last,
               let lastCurrent = messages.last,
               lastNew.id != lastCurrent.id || newMessages.count > messages.count {
                messages = newMessages
            }
        } catch {
            // Silently fail on polling errors
            print("Polling error: \(error)")
        }
    }

    // MARK: - Push Notification Handling

    private func setupNotificationObserver() {
        NotificationCenter.default.publisher(for: .pushNotificationTapped)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                guard let self = self,
                      let userInfo = notification.userInfo,
                      let pushNotification = userInfo["notification"] as? PushNotification,
                      pushNotification.type == "MESSAGE_RECEIVED" else { return }

                // Refresh messages when a message notification is tapped
                Task {
                    await self.loadMessages()
                }
            }
            .store(in: &cancellables)
    }
}
