import Foundation

struct Conversation: Codable, Identifiable {
    let id: String
    let otherUser: User
    let lastMessage: Message?
    let unreadCount: Int

    enum CodingKeys: String, CodingKey {
        case id, otherUser, lastMessage, unreadCount
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        otherUser = try container.decode(User.self, forKey: .otherUser)
        lastMessage = try container.decodeIfPresent(Message.self, forKey: .lastMessage)
        unreadCount = try container.decodeIfPresent(Int.self, forKey: .unreadCount) ?? 0
    }
}

struct Message: Codable, Identifiable {
    let id: String
    let senderId: String
    let receiverId: String
    let content: String
    let timestamp: TimeInterval
    let isRead: Bool

    var formattedTime: String {
        let date = Date(timeIntervalSince1970: timestamp / 1000)
        let formatter = DateFormatter()

        if Calendar.current.isDateInToday(date) {
            formatter.dateFormat = "h:mm a"
        } else if Calendar.current.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            formatter.dateFormat = "MMM d"
        }

        return formatter.string(from: date)
    }

    enum CodingKeys: String, CodingKey {
        case id, senderId, receiverId, content, timestamp, isRead
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        senderId = try container.decode(String.self, forKey: .senderId)
        receiverId = try container.decode(String.self, forKey: .receiverId)
        content = try container.decode(String.self, forKey: .content)
        timestamp = try container.decodeIfPresent(TimeInterval.self, forKey: .timestamp) ?? Date().timeIntervalSince1970 * 1000
        isRead = try container.decodeIfPresent(Bool.self, forKey: .isRead) ?? false
    }
}

struct ConversationsResponse: Codable {
    let conversations: [Conversation]
}

struct MessagesResponse: Codable {
    let messages: [Message]
}

struct MessageResponse: Codable {
    let message: Message
}

struct SendMessageRequest: Codable {
    let receiverId: String
    let content: String
    let bookingId: String?
}
