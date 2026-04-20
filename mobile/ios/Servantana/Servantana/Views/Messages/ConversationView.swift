import SwiftUI

@MainActor
class ConversationViewModel: ObservableObject {
    @Published var messages: [Message] = []
    @Published var partner: User?
    @Published var isLoading = true
    @Published var error: String?
    @Published var isSending = false

    let partnerId: String
    var currentUserId: String?
    private var pollTask: Task<Void, Never>?

    init(partnerId: String) {
        self.partnerId = partnerId
    }

    func loadMessages() async {
        isLoading = messages.isEmpty
        error = nil

        do {
            let response = try await APIService.shared.getMessages(partnerId: partnerId)
            messages = response.messages.sorted { $0.createdAt < $1.createdAt }

            // Get partner from messages
            if let firstMessage = messages.first {
                partner = firstMessage.senderId == partnerId ? firstMessage.sender : firstMessage.receiver
            }

            // Mark as read
            _ = try? await APIService.shared.markMessagesRead(partnerId: partnerId)
        } catch APIError.serverError(let message) {
            if messages.isEmpty {
                error = message
            }
        } catch {
            if messages.isEmpty {
                self.error = "Failed to load messages"
            }
        }

        isLoading = false
    }

    func sendMessage(_ content: String) async {
        guard !content.isEmpty else { return }

        isSending = true

        do {
            let message = try await APIService.shared.sendMessage(receiverId: partnerId, content: content)
            messages.append(message)
        } catch {
            // Handle error
        }

        isSending = false
    }

    func startPolling() {
        pollTask = Task {
            while !Task.isCancelled {
                await loadMessages()
                try? await Task.sleep(nanoseconds: 3_000_000_000) // 3 seconds
            }
        }
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }
}

struct ConversationView: View {
    let partnerId: String
    @StateObject private var viewModel: ConversationViewModel
    @EnvironmentObject var authManager: AuthManager
    @State private var messageText = ""

    init(partnerId: String) {
        self.partnerId = partnerId
        self._viewModel = StateObject(wrappedValue: ConversationViewModel(partnerId: partnerId))
    }

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading && viewModel.messages.isEmpty {
                Spacer()
                ProgressView()
                Spacer()
            } else if let error = viewModel.error, viewModel.messages.isEmpty {
                Spacer()
                VStack(spacing: 16) {
                    Text(error)
                        .foregroundColor(.red)
                    Button("Retry") {
                        Task {
                            await viewModel.loadMessages()
                        }
                    }
                }
                Spacer()
            } else if viewModel.messages.isEmpty {
                Spacer()
                VStack(spacing: 16) {
                    Image(systemName: "message")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    Text("Start the conversation")
                        .font(.headline)
                    Text("Send a message to begin")
                        .foregroundColor(.secondary)
                }
                Spacer()
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(viewModel.messages) { message in
                                MessageBubble(
                                    message: message,
                                    isOwnMessage: message.senderId == authManager.currentUser?.id
                                )
                                .id(message.id)
                            }
                        }
                        .padding()
                    }
                    .onChange(of: viewModel.messages.count) { _, _ in
                        if let lastMessage = viewModel.messages.last {
                            withAnimation {
                                proxy.scrollTo(lastMessage.id, anchor: .bottom)
                            }
                        }
                    }
                }
            }

            // Input Bar
            HStack(spacing: 8) {
                TextField("Type a message...", text: $messageText, axis: .vertical)
                    .lineLimit(1...4)
                    .padding(12)
                    .background(Color(.systemGray6))
                    .cornerRadius(20)

                Button(action: sendMessage) {
                    if viewModel.isSending {
                        ProgressView()
                            .frame(width: 36, height: 36)
                    } else {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title)
                            .foregroundColor(messageText.isEmpty ? .secondary : .accentColor)
                    }
                }
                .disabled(messageText.isEmpty || viewModel.isSending)
            }
            .padding()
            .background(Color(.systemBackground))
            .shadow(color: .black.opacity(0.05), radius: 5, y: -5)
        }
        .navigationTitle(viewModel.partner?.fullName ?? "Chat")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.currentUserId = authManager.currentUser?.id
            viewModel.startPolling()
        }
        .onDisappear {
            viewModel.stopPolling()
        }
    }

    private func sendMessage() {
        let text = messageText
        messageText = ""
        Task {
            await viewModel.sendMessage(text)
        }
    }
}

struct MessageBubble: View {
    let message: Message
    let isOwnMessage: Bool

    var body: some View {
        HStack {
            if isOwnMessage { Spacer() }

            VStack(alignment: isOwnMessage ? .trailing : .leading, spacing: 2) {
                Text(message.content)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isOwnMessage ? Color.accentColor : Color(.systemGray5))
                    .foregroundColor(isOwnMessage ? .white : .primary)
                    .cornerRadius(16, corners: isOwnMessage ? [.topLeft, .topRight, .bottomLeft] : [.topLeft, .topRight, .bottomRight])

                HStack(spacing: 4) {
                    Text(formatTime(message.createdAt))
                        .font(.caption2)
                        .foregroundColor(.secondary)

                    if isOwnMessage {
                        Image(systemName: message.read == true ? "checkmark.circle.fill" : "checkmark.circle")
                            .font(.caption2)
                            .foregroundColor(message.read == true ? .accentColor : .secondary)
                    }
                }
            }
            .frame(maxWidth: 280, alignment: isOwnMessage ? .trailing : .leading)

            if !isOwnMessage { Spacer() }
        }
    }

    private func formatTime(_ isoTime: String) -> String {
        guard let range = isoTime.range(of: "T") else { return isoTime }
        let time = String(isoTime[range.upperBound...])
        return String(time.prefix(5))
    }
}

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

#Preview {
    NavigationStack {
        ConversationView(partnerId: "123")
            .environmentObject(AuthManager())
    }
}
