import Foundation

struct Review: Codable, Identifiable {
    let id: String
    let rating: Int
    let comment: String?
    let createdAt: String
    let customer: User?

    var formattedDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        guard let date = formatter.date(from: createdAt) else { return createdAt }

        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM d, yyyy"
        return displayFormatter.string(from: date)
    }

    enum CodingKeys: String, CodingKey {
        case id, rating, comment, createdAt, customer
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        rating = try container.decode(Int.self, forKey: .rating)
        comment = try container.decodeIfPresent(String.self, forKey: .comment)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt) ?? ""
        customer = try container.decodeIfPresent(User.self, forKey: .customer)
    }
}

struct ReviewsResponse: Codable {
    let reviews: [Review]
}

struct ReviewResponse: Codable {
    let review: Review
}

struct CreateReviewRequest: Codable {
    let bookingId: String
    let rating: Int
    let comment: String?
}

struct Favorite: Codable, Identifiable {
    let id: String
    let cleaner: Worker
}

struct FavoritesResponse: Codable {
    let favorites: [Favorite]
}

struct AddFavoriteRequest: Codable {
    let cleanerId: String
}

struct CategoriesResponse: Codable {
    let categories: [Category]
}

struct ProfessionsResponse: Codable {
    let professions: [Profession]
}
