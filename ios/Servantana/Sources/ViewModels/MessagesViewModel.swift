import Foundation

@MainActor
class MessagesViewModel: ObservableObject {
    @Published var conversations: [Conversation] = []
    @Published var isLoading = false
    @Published var error: String?

    init() {
        Task {
            await loadConversations()
        }
    }

    func loadConversations() async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.getConversations()
            conversations = response.conversations
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
