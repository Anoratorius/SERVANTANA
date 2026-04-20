import Foundation

// MARK: - Auth Models

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let firstName: String
    let lastName: String
    let phone: String?
    let role: String

    init(email: String, password: String, firstName: String, lastName: String, phone: String? = nil, role: String = "CUSTOMER") {
        self.email = email
        self.password = password
        self.firstName = firstName
        self.lastName = lastName
        self.phone = phone
        self.role = role
    }
}

struct AuthResponse: Codable {
    let user: User
    let token: String
}

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let phone: String?
    let avatar: String?
    let role: String
    let isEmailVerified: Bool?
    let createdAt: String?

    var fullName: String {
        "\(firstName) \(lastName)"
    }

    var isWorker: Bool {
        role == "CLEANER"
    }

    var isCustomer: Bool {
        role == "CUSTOMER"
    }

    var initials: String {
        let first = firstName.first.map(String.init) ?? ""
        let last = lastName.first.map(String.init) ?? ""
        return first + last
    }
}

// MARK: - Service Models

struct Service: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let icon: String?
    let basePrice: Double?
    let priceUnit: String?
    let category: String?
}

// MARK: - Worker Models

struct Worker: Codable, Identifiable {
    let id: String
    let firstName: String
    let lastName: String
    let avatar: String?
    let rating: Double?
    let reviewCount: Int?
    let hourlyRate: Double?
    let bio: String?
    let verified: Bool?
    let services: [Service]?
    let distance: Double?

    var fullName: String {
        "\(firstName) \(lastName)"
    }

    var initials: String {
        let first = firstName.first.map(String.init) ?? ""
        let last = lastName.first.map(String.init) ?? ""
        return first + last
    }
}

struct WorkerProfile: Codable {
    let id: String
    let userId: String
    let bio: String?
    let hourlyRate: Double?
    let experience: Int?
    let address: String?
    let city: String?
    let country: String?
    let verified: Bool?
    let rating: Double?
    let completedJobs: Int?
}

// MARK: - Booking Models

struct Booking: Codable, Identifiable {
    let id: String
    let status: String
    let scheduledDate: String
    let scheduledTime: String
    let duration: Int?
    let address: String
    let city: String?
    let totalPrice: Double
    let currency: String?
    let notes: String?
    let service: Service?
    let customer: User?
    let cleaner: User?
    let createdAt: String?

    var isPending: Bool { status == "PENDING" }
    var isConfirmed: Bool { status == "CONFIRMED" }
    var isInProgress: Bool { status == "IN_PROGRESS" }
    var isCompleted: Bool { status == "COMPLETED" }
    var isCancelled: Bool { status == "CANCELLED" }

    var statusColor: String {
        switch status {
        case "PENDING": return "orange"
        case "CONFIRMED": return "blue"
        case "IN_PROGRESS": return "green"
        case "COMPLETED": return "blue"
        case "CANCELLED": return "red"
        default: return "gray"
        }
    }
}

struct CreateBookingRequest: Codable {
    let serviceId: String
    let cleanerId: String
    let scheduledDate: String
    let scheduledTime: String
    let duration: Int
    let address: String
    let city: String?
    let latitude: Double?
    let longitude: Double?
    let notes: String?
}

struct BookingResponse: Codable {
    let booking: Booking
}

struct BookingsListResponse: Codable {
    let bookings: [Booking]
}

// MARK: - Tracking Models

struct TrackingData: Codable {
    let trackingActive: Bool
    let workerLocation: LocationData?
    let destination: LocationData?
    let estimatedArrival: String?
    let distanceKm: Double?
    let cleanerName: String?
    let status: String?
}

struct LocationData: Codable {
    let latitude: Double
    let longitude: Double
    let lastUpdate: String?
    let address: String?
}

struct UpdateLocationRequest: Codable {
    let latitude: Double
    let longitude: Double
    let action: String?
}

// MARK: - Message Models

struct Message: Codable, Identifiable {
    let id: String
    let content: String
    let senderId: String
    let receiverId: String
    let read: Bool?
    let createdAt: String
    let sender: User?
    let receiver: User?
}

struct Conversation: Codable, Identifiable {
    let partnerId: String
    let partner: User
    let lastMessage: MessagePreview
    let unreadCount: Int?

    var id: String { partnerId }
}

struct MessagePreview: Codable {
    let id: String
    let content: String
    let createdAt: String
    let senderId: String
    let read: Bool?
}

struct SendMessageRequest: Codable {
    let receiverId: String
    let content: String
    let bookingId: String?
}

struct ConversationsResponse: Codable {
    let conversations: [Conversation]
}

struct MessagesResponse: Codable {
    let messages: [Message]
}

// MARK: - Review Models

struct Review: Codable, Identifiable {
    let id: String
    let rating: Int
    let comment: String?
    let createdAt: String
    let reviewer: User?
}

struct CreateReviewRequest: Codable {
    let bookingId: String
    let rating: Int
    let comment: String?
}

// MARK: - API Response Wrappers

struct APIError: Codable {
    let error: String
    let details: String?
}

struct SuccessResponse: Codable {
    let message: String?
    let success: Bool?
}
