import SwiftUI

struct AIChatView: View {
    @StateObject private var viewModel = AIChatViewModel()
    @State private var inputText = ""

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(viewModel.messages) { message in
                            AIMessageBubble(message: message).id(message.id)
                        }
                        if viewModel.isLoading {
                            HStack {
                                ProgressView().padding()
                                Spacer()
                            }
                        }
                    }
                    .padding()
                }
                .onChange(of: viewModel.messages.count) { _, _ in
                    if let last = viewModel.messages.last {
                        withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                    }
                }
            }

            // Suggestions
            if !viewModel.suggestions.isEmpty && viewModel.messages.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(viewModel.suggestions, id: \.self) { suggestion in
                            Button(suggestion) {
                                inputText = suggestion
                                sendMessage()
                            }
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color(.systemGray6))
                            .cornerRadius(20)
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 8)
            }

            Divider()

            // Input
            HStack(spacing: 12) {
                TextField("Ask me anything...", text: $inputText, axis: .vertical)
                    .lineLimit(1...5)
                Button { sendMessage() } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title)
                        .foregroundStyle(inputText.isEmpty ? .secondary : .accentColor)
                }
                .disabled(inputText.isEmpty || viewModel.isLoading)
            }
            .padding()
        }
        .navigationTitle("AI Assistant")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        inputText = ""
        Task { await viewModel.sendMessage(text) }
    }
}

struct AIMessage: Identifiable {
    let id = UUID()
    let content: String
    let isUser: Bool
}

struct AIMessageBubble: View {
    let message: AIMessage
    var body: some View {
        HStack {
            if message.isUser { Spacer(minLength: 60) }
            HStack(alignment: .top, spacing: 8) {
                if !message.isUser {
                    Image(systemName: "sparkles")
                        .foregroundStyle(.purple)
                        .padding(8)
                        .background(Color.purple.opacity(0.1))
                        .clipShape(Circle())
                }
                Text(message.content)
                    .padding(12)
                    .background(message.isUser ? Color.accentColor : Color(.systemGray6))
                    .foregroundStyle(message.isUser ? .white : .primary)
                    .cornerRadius(16)
            }
            if !message.isUser { Spacer(minLength: 60) }
        }
    }
}

@MainActor
class AIChatViewModel: ObservableObject {
    @Published var messages: [AIMessage] = []
    @Published var suggestions = ["Find a cleaner near me", "What services are available?", "How do I book?"]
    @Published var isLoading = false

    func sendMessage(_ text: String) async {
        messages.append(AIMessage(content: text, isUser: true))
        isLoading = true

        do {
            let history = messages.dropLast().map { ChatMessage(role: $0.isUser ? "user" : "assistant", content: $0.content) }
            let request = AIChatRequest(message: text, history: Array(history))
            let response = try await APIClient.shared.aiChat(request)
            messages.append(AIMessage(content: response.response, isUser: false))
            if let newSuggestions = response.suggestions { suggestions = newSuggestions }
        } catch {
            messages.append(AIMessage(content: "Sorry, I couldn't process that. Please try again.", isUser: false))
        }

        isLoading = false
    }
}
