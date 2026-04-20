import SwiftUI

@MainActor
class MessagesViewModel: ObservableObject {
    @Published var conversations: [Conversation] = []
    @Published var isLoading = true
    @Published var error: String?

    func loadConversations() async {
        isLoading = true
        error = nil

        do {
            let response = try await APIService.shared.getConversations()
            conversations = response.conversations
        } catch APIError.serverError(let message) {
            error = message
        } catch {
            self.error = "Failed to load messages"
        }

        isLoading = false
    }
}

struct MessagesView: View {
    @StateObject private var viewModel = MessagesViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if let error = viewModel.error {
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.red)
                        Button("Retry") {
                            Task {
                                await viewModel.loadConversations()
                            }
                        }
                    }
                } else if viewModel.conversations.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "message")
                            .font(.system(size: 48))
                            .foregroundColor(.secondary)
                        Text("No messages yet")
                            .font(.headline)
                        Text("Start a conversation by booking a service")
                            .foregroundColor(.secondary)
                    }
                } else {
                    List(viewModel.conversations) { conversation in
                        NavigationLink(destination: ConversationView(partnerId: conversation.partnerId)) {
                            ConversationRow(conversation: conversation)
                        }
                    }
                    .listStyle(.plain)
                    .refreshable {
                        await viewModel.loadConversations()
                    }
                }
            }
            .navigationTitle("Messages")
            .task {
                await viewModel.loadConversations()
            }
        }
    }
}

struct ConversationRow: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 12) {
            ZStack(alignment: .topTrailing) {
                Circle()
                    .fill(Color.accentColor.opacity(0.1))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Text(conversation.partner.initials)
                            .fontWeight(.bold)
                            .foregroundColor(.accentColor)
                    )

                if (conversation.unreadCount ?? 0) > 0 {
                    Circle()
                        .fill(Color.red)
                        .frame(width: 20, height: 20)
                        .overlay(
                            Text("\(min(conversation.unreadCount ?? 0, 9))\(conversation.unreadCount ?? 0 > 9 ? "+" : "")")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                        )
                }
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(conversation.partner.fullName)
                        .fontWeight((conversation.unreadCount ?? 0) > 0 ? .bold : .semibold)
                    Spacer()
                    Text(formatTime(conversation.lastMessage.createdAt))
                        .font(.caption)
                        .foregroundColor((conversation.unreadCount ?? 0) > 0 ? .accentColor : .secondary)
                }

                Text(conversation.lastMessage.content)
                    .font(.subheadline)
                    .foregroundColor((conversation.unreadCount ?? 0) > 0 ? .primary : .secondary)
                    .fontWeight((conversation.unreadCount ?? 0) > 0 ? .medium : .regular)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }

    private func formatTime(_ isoTime: String) -> String {
        guard let range = isoTime.range(of: "T") else { return isoTime }
        let time = String(isoTime[range.upperBound...])
        return String(time.prefix(5))
    }
}

#Preview {
    MessagesView()
}
