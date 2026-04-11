import Foundation

enum BookingStatus: String, Codable, CaseIterable {
    case pending = "PENDING"
    case confirmed = "CONFIRMED"
    case inProgress = "IN_PROGRESS"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"

    var displayName: String {
        switch self {
        case .pending: return "Pending"
        case .confirmed: return "Confirmed"
        case .inProgress: return "In Progress"
        case .completed: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }

    var color: String {
        switch self {
        case .pending: return "orange"
        case .confirmed: return "blue"
        case .inProgress: return "purple"
        case .completed: return "green"
        case .cancelled: return "red"
        }
    }
}

struct Booking: Codable, Identifiable {
    let id: String
    let status: BookingStatus
    let scheduledDate: String
    let scheduledTime: String
    let duration: Int
    let totalPrice: Float
    let currency: String
    let address: String?
    let city: String?
    let notes: String?
    let cleaner: Worker?
    let customer: User?
    let service: Service?
    let review: Review?

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: scheduledDate) else { return scheduledDate }
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        guard let time = formatter.date(from: scheduledTime) else { return scheduledTime }
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: time)
    }

    enum CodingKeys: String, CodingKey {
        case id, status, scheduledDate, scheduledTime, duration
        case totalPrice, currency, address, city, notes
        case cleaner, customer, service, review
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)

        let statusString = try container.decode(String.self, forKey: .status)
        status = BookingStatus(rawValue: statusString) ?? .pending

        scheduledDate = try container.decode(String.self, forKey: .scheduledDate)
        scheduledTime = try container.decode(String.self, forKey: .scheduledTime)
        duration = try container.decode(Int.self, forKey: .duration)
        totalPrice = try container.decode(Float.self, forKey: .totalPrice)
        currency = try container.decodeIfPresent(String.self, forKey: .currency) ?? "EUR"
        address = try container.decodeIfPresent(String.self, forKey: .address)
        city = try container.decodeIfPresent(String.self, forKey: .city)
        notes = try container.decodeIfPresent(String.self, forKey: .notes)
        cleaner = try container.decodeIfPresent(Worker.self, forKey: .cleaner)
        customer = try container.decodeIfPresent(User.self, forKey: .customer)
        service = try container.decodeIfPresent(Service.self, forKey: .service)
        review = try container.decodeIfPresent(Review.self, forKey: .review)
    }
}

struct BookingsResponse: Codable {
    let bookings: [Booking]
}

struct BookingResponse: Codable {
    let booking: Booking
}

struct CreateBookingRequest: Codable {
    let cleanerId: String
    let serviceId: String?
    let scheduledDate: String
    let scheduledTime: String
    let duration: Int
    let address: String
    let city: String?
    let postalCode: String?
    let latitude: Double?
    let longitude: Double?
    let notes: String?
    let totalPrice: Float
}

struct CancelBookingRequest: Codable {
    let reason: String?
}
