import SwiftUI

struct MessagesView: View {
    @StateObject private var viewModel = MessagesViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView()
                } else if viewModel.conversations.isEmpty {
                    emptyState
                } else {
                    conversationsList
                }
            }
            .navigationTitle("Messages")
            .refreshable {
                await viewModel.loadConversations()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "message")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("No messages yet")
                .font(.headline)
            Text("Start a conversation with a worker")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var conversationsList: some View {
        List(viewModel.conversations) { conversation in
            NavigationLink {
                ChatView(userId: conversation.otherUser.id)
            } label: {
                ConversationRow(conversation: conversation)
            }
        }
        .listStyle(.plain)
    }
}

struct ConversationRow: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Color(.systemGray4))
                .frame(width: 50, height: 50)
                .overlay {
                    Image(systemName: "person.fill")
                        .foregroundStyle(.white)
                }

            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(conversation.otherUser.fullName)
                        .font(.headline)
                    Spacer()
                    if let message = conversation.lastMessage {
                        Text(message.formattedTime)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                HStack {
                    if let message = conversation.lastMessage {
                        Text(message.content)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer()
                    if conversation.unreadCount > 0 {
                        Text("\(conversation.unreadCount)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(Color.accentColor)
                            .clipShape(Capsule())
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    MessagesView()
}
