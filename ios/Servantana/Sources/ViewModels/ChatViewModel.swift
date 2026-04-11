import Foundation

@MainActor
class ChatViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var otherUserName = "Chat"
    @Published var isLoading = false
    @Published var isSending = false
    @Published var error: String?

    private let userId: String

    init(userId: String) {
        self.userId = userId
        Task {
            await loadMessages()
        }
    }

    func loadMessages() async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.getMessages(conversationId: userId)
            messages = response.messages.sorted { $0.timestamp < $1.timestamp }
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
}
