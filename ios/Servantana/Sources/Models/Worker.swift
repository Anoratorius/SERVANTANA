import Foundation

struct Worker: Codable, Identifiable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let avatar: String?
    let role: String
    let workerProfile: WorkerProfile?

    var fullName: String {
        "\(firstName) \(lastName)"
    }

    var rating: Double {
        workerProfile?.averageRating ?? 0.0
    }

    var reviewCount: Int {
        workerProfile?.totalBookings ?? 0
    }

    var hourlyRate: Double? {
        workerProfile?.hourlyRate
    }

    var profession: String? {
        workerProfile?.professions.first(where: { $0.isPrimary })?.profession.name
            ?? workerProfile?.professions.first?.profession.name
    }

    var isVerified: Bool {
        workerProfile?.isVerified ?? false
    }

    enum CodingKeys: String, CodingKey {
        case id, email, firstName, lastName, avatar, role, workerProfile
    }
}

struct WorkerProfile: Codable {
    let id: String
    let bio: String?
    let hourlyRate: Double
    let currency: String
    let yearsExperience: Int
    let isVerified: Bool
    let ecoFriendly: Bool
    let petFriendly: Bool
    let city: String?
    let averageRating: Double
    let totalBookings: Int
    let distance: Float?
    let professions: [WorkerProfession]
    let services: [WorkerService]
    let availability: [Availability]

    enum CodingKeys: String, CodingKey {
        case id, bio, hourlyRate, currency, yearsExperience, isVerified
        case ecoFriendly, petFriendly, city, averageRating, totalBookings
        case distance, professions, services, availability
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        bio = try container.decodeIfPresent(String.self, forKey: .bio)
        hourlyRate = try container.decode(Double.self, forKey: .hourlyRate)
        currency = try container.decodeIfPresent(String.self, forKey: .currency) ?? "EUR"
        yearsExperience = try container.decodeIfPresent(Int.self, forKey: .yearsExperience) ?? 0
        isVerified = try container.decodeIfPresent(Bool.self, forKey: .isVerified) ?? false
        ecoFriendly = try container.decodeIfPresent(Bool.self, forKey: .ecoFriendly) ?? false
        petFriendly = try container.decodeIfPresent(Bool.self, forKey: .petFriendly) ?? false
        city = try container.decodeIfPresent(String.self, forKey: .city)
        averageRating = try container.decodeIfPresent(Double.self, forKey: .averageRating) ?? 0.0
        totalBookings = try container.decodeIfPresent(Int.self, forKey: .totalBookings) ?? 0
        distance = try container.decodeIfPresent(Float.self, forKey: .distance)
        professions = try container.decodeIfPresent([WorkerProfession].self, forKey: .professions) ?? []
        services = try container.decodeIfPresent([WorkerService].self, forKey: .services) ?? []
        availability = try container.decodeIfPresent([Availability].self, forKey: .availability) ?? []
    }
}

struct WorkerProfession: Codable {
    let isPrimary: Bool
    let profession: Profession
}

struct Profession: Codable, Identifiable {
    let id: String
    let name: String
    let nameDE: String?
    let emoji: String?
    let category: Category?
}

struct Category: Codable, Identifiable {
    let id: String
    let name: String
    let nameDE: String?
    let emoji: String?
    let gradient: String?
}

struct WorkerService: Codable {
    let customPrice: Float?
    let service: Service
}

struct Service: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let basePrice: Float
    let duration: Int
    let isSpecialty: Bool

    enum CodingKeys: String, CodingKey {
        case id, name, description, basePrice, duration, isSpecialty
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        basePrice = try container.decode(Float.self, forKey: .basePrice)
        duration = try container.decode(Int.self, forKey: .duration)
        isSpecialty = try container.decodeIfPresent(Bool.self, forKey: .isSpecialty) ?? false
    }
}

struct Availability: Codable {
    let dayOfWeek: Int
    let startTime: String
    let endTime: String
    let isActive: Bool
}

struct WorkersResponse: Codable {
    let cleaners: [Worker]
}

struct WorkerDetailResponse: Codable {
    let worker: Worker
}
