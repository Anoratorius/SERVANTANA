import Foundation

// MARK: - Worker Profile

struct WorkerProfile: Codable, Identifiable {
    let id: String
    let userId: String
    let bio: String?
    let hourlyRate: Double
    let experienceYears: Int?
    let availableNow: Bool
    let ecoFriendly: Bool
    let petFriendly: Bool
    let address: String?
    let city: String?
    let state: String?
    let country: String?
    let postalCode: String?
    let serviceRadius: Int?
    let timezone: String?
    let onboardingComplete: Bool
    let stripeAccountId: String?
    let stripeOnboardingComplete: Bool
    let professions: [WorkerProfession]?
    let availability: [WorkerAvailability]?

    enum CodingKeys: String, CodingKey {
        case id, userId, bio, hourlyRate, experienceYears
        case availableNow, ecoFriendly, petFriendly
        case address, city, state, country, postalCode
        case serviceRadius, timezone, onboardingComplete
        case stripeAccountId, stripeOnboardingComplete
        case professions, availability
    }
}

struct WorkerProfileResponse: Codable {
    let user: User
    let profile: WorkerProfile?
}

struct WorkerProfileUpdateRequest: Codable {
    var firstName: String?
    var lastName: String?
    var phone: String?
    var bio: String?
    var hourlyRate: Double?
    var experienceYears: Int?
    var availableNow: Bool?
    var ecoFriendly: Bool?
    var petFriendly: Bool?
    var address: String?
    var city: String?
    var state: String?
    var country: String?
    var postalCode: String?
    var serviceRadius: Int?
    var timezone: String?
}

struct WorkerProfileUpdateResponse: Codable {
    let message: String
    let profile: WorkerProfile
}

// MARK: - Professions

struct Profession: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let slug: String
    let description: String?
    let icon: String?
    let categoryId: String
    let category: Category?

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Profession, rhs: Profession) -> Bool {
        lhs.id == rhs.id
    }
}

struct Category: Codable, Identifiable {
    let id: String
    let name: String
    let slug: String
    let description: String?
    let icon: String?
}

struct WorkerProfession: Codable, Identifiable {
    let id: String
    let workerId: String
    let professionId: String
    let isPrimary: Bool
    let profession: Profession?
}

struct ProfessionsResponse: Codable {
    let professions: [Profession]
}

struct CategoriesResponse: Codable {
    let categories: [Category]
}

struct WorkerProfessionsResponse: Codable {
    let professions: [WorkerProfession]
}

struct AddProfessionRequest: Codable {
    let professionId: String
    let isPrimary: Bool
}

struct UpdatePrimaryProfessionRequest: Codable {
    let professionId: String
}

// MARK: - Availability

struct WorkerAvailability: Codable, Identifiable {
    let id: String
    let workerId: String
    let dayOfWeek: Int  // 0 = Sunday, 6 = Saturday
    let startTime: String  // HH:mm format
    let endTime: String
    let isEnabled: Bool

    var dayName: String {
        let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        guard dayOfWeek >= 0 && dayOfWeek < 7 else { return "Unknown" }
        return days[dayOfWeek]
    }
}

struct AvailabilityResponse: Codable {
    let availability: [WorkerAvailability]
}

struct SetAvailabilityRequest: Codable {
    let availability: [AvailabilitySlot]

    struct AvailabilitySlot: Codable {
        let dayOfWeek: Int
        let startTime: String
        let endTime: String
        let isEnabled: Bool
    }
}

// MARK: - Documents

enum DocumentType: String, Codable, CaseIterable {
    case governmentId = "GOVERNMENT_ID"
    case driversLicense = "DRIVERS_LICENSE"
    case passport = "PASSPORT"
    case businessLicense = "BUSINESS_LICENSE"
    case insuranceCertificate = "INSURANCE_CERTIFICATE"
    case backgroundCheck = "BACKGROUND_CHECK"
    case other = "OTHER"

    var displayName: String {
        switch self {
        case .governmentId: return "Government ID"
        case .driversLicense: return "Driver's License"
        case .passport: return "Passport"
        case .businessLicense: return "Business License"
        case .insuranceCertificate: return "Insurance Certificate"
        case .backgroundCheck: return "Background Check"
        case .other: return "Other Document"
        }
    }

    var description: String {
        switch self {
        case .governmentId: return "National ID card or similar"
        case .driversLicense: return "Valid driver's license"
        case .passport: return "Valid passport"
        case .businessLicense: return "Business registration or trade license"
        case .insuranceCertificate: return "Liability insurance certificate"
        case .backgroundCheck: return "Police clearance or background check"
        case .other: return "Any other relevant document"
        }
    }

    var isRequired: Bool {
        switch self {
        case .governmentId, .driversLicense, .passport:
            return true
        default:
            return false
        }
    }
}

enum DocumentStatus: String, Codable {
    case pending = "PENDING"
    case verified = "VERIFIED"
    case rejected = "REJECTED"
    case expired = "EXPIRED"

    var displayName: String {
        switch self {
        case .pending: return "Pending Review"
        case .verified: return "Verified"
        case .rejected: return "Rejected"
        case .expired: return "Expired"
        }
    }
}

struct WorkerDocument: Codable, Identifiable {
    let id: String
    let cleanerId: String
    let type: DocumentType
    let fileUrl: String
    let fileName: String
    let fileSize: Int
    let status: DocumentStatus
    let rejectionReason: String?
    let expiresAt: String?
    let verifiedAt: String?
    let createdAt: String
}

struct DocumentsResponse: Codable {
    let documents: [WorkerDocument]
    let counts: DocumentCounts

    struct DocumentCounts: Codable {
        let pending: Int
        let verified: Int
        let rejected: Int
        let expired: Int
        let total: Int
    }
}

struct DocumentUploadResponse: Codable {
    let document: WorkerDocument
}

// MARK: - Stripe Connect

struct StripeConnectStatus: Codable {
    let status: String  // "none", "pending", "restricted", "complete"
    let stripeAccountId: String?
    let onboardingComplete: Bool
    let dashboardUrl: String?
}

struct StripeConnectLinkResponse: Codable {
    let url: String
    let stripeAccountId: String
}

// MARK: - Onboarding Completion

struct OnboardingCompleteResponse: Codable {
    let message: String
    let onboardingComplete: Bool
}

struct OnboardingErrorResponse: Codable {
    let error: String
    let details: [String]?
}
