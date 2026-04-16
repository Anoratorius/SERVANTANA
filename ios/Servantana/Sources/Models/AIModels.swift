import Foundation

// MARK: - AI Chat
struct AIChatRequest: Codable {
    let message: String
    let conversationHistory: [ChatMessage]

    init(message: String, history: [ChatMessage]) {
        self.message = message
        self.conversationHistory = history
    }
}

struct ChatMessage: Codable {
    let role: String
    let content: String
}

struct AIChatResponse: Codable {
    let message: String
    let suggestedActions: [SuggestedAction]?

    // Computed property for backward compatibility
    var response: String { message }
    var suggestions: [String]? {
        suggestedActions?.map { $0.label }
    }
}

struct SuggestedAction: Codable {
    let label: String
    let action: String
    let url: String?
}

// MARK: - Smart Match
struct SmartMatchRequest: Codable {
    let categoryId: String?
    let professionId: String?
    let latitude: Double
    let longitude: Double
    let maxDistance: Int
    let preferences: MatchPreferences?
}

struct MatchPreferences: Codable {
    let prioritizeRating: Bool?
    let prioritizePrice: Bool?
    let prioritizeDistance: Bool?
    let ecoFriendly: Bool?
    let petFriendly: Bool?
}

struct SmartMatchResponse: Codable {
    let matches: [SmartMatchResult]
    let totalCandidates: Int?
    let scoringWeights: [String: Double]?

    // Alias for backward compatibility
    var results: [SmartMatchResult] { matches }
}

struct SmartMatchResult: Codable, Identifiable {
    let worker: Worker
    let matchScore: Int
    let matchPercentage: Int
    let factors: MatchFactors
    let matchReasons: [String]

    var id: String { worker.id }

    // UI helper
    var recommendation: String? { matchReasons.first }
}

struct MatchFactors: Codable {
    let ratingScore: Double
    let experienceScore: Double
    let distanceScore: Double
    let priceScore: Double
    let availabilityScore: Double
    let preferencesScore: Double
    let reliabilityScore: Double
    let verificationScore: Double
    let responseTimeScore: Double
    let repeatCustomerScore: Double
}

// MARK: - Smart Schedule
struct SmartScheduleRequest: Codable {
    let date: String
    let professionId: String?
    let workerId: String?
    let duration: Int?
}

struct SmartScheduleResponse: Codable {
    let slots: [TimeSlot]
    let demandForecast: DemandForecast?
}

struct TimeSlot: Codable, Identifiable {
    let id: String
    let time: String
    let available: Bool
    let demandLevel: String
    let priceMultiplier: Double
    let recommendation: String?

    enum CodingKeys: String, CodingKey {
        case id, time, available, demandLevel, priceMultiplier, recommendation
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        time = try container.decode(String.self, forKey: .time)
        id = time
        available = try container.decodeIfPresent(Bool.self, forKey: .available) ?? true
        demandLevel = try container.decodeIfPresent(String.self, forKey: .demandLevel) ?? "normal"
        priceMultiplier = try container.decodeIfPresent(Double.self, forKey: .priceMultiplier) ?? 1.0
        recommendation = try container.decodeIfPresent(String.self, forKey: .recommendation)
    }
}

struct DemandForecast: Codable {
    let peakHours: [String]
    let lowDemandHours: [String]
    let recommendation: String
}

// MARK: - Review Insights
struct ReviewInsightsRequest: Codable {
    let workerId: String
}

struct ReviewInsightsResponse: Codable {
    let overallSentiment: String
    let trustScore: Double
    let insights: [ReviewInsight]
    let strengths: [String]
    let areasForImprovement: [String]
}

struct ReviewInsight: Codable, Identifiable {
    let category: String
    let sentiment: String
    let score: Double
    let mentions: Int
    let keywords: [String]

    var id: String { category }
}

// MARK: - Photo Analysis
struct PhotoAnalysisRequest: Codable {
    let imageUrls: [String]
    let analysisType: String // "single" or "before_after"
    let bookingId: String?

    init(imageUrls: [String], analysisType: String = "single", bookingId: String? = nil) {
        self.imageUrls = imageUrls
        self.analysisType = analysisType
        self.bookingId = bookingId
    }
}

struct PhotoAnalysisResponse: Codable {
    let type: String
    let summary: PhotoAnalysisSummary?
    let comparison: BeforeAfterComparison?
    let bookingId: String?
}

struct PhotoAnalysisSummary: Codable {
    let averageCleanlinessScore: Double
    let overallCondition: String
    let allConcerns: [String]
    let allPositives: [String]
    let averageJobComplexity: String
    let totalEstimatedTime: Int
    let averageConfidence: Int
}

struct BeforeAfterComparison: Codable {
    let improvementScore: Int
    let beforeScore: Int
    let afterScore: Int
    let improvements: [String]
    let remainingIssues: [String]
    let qualityVerified: Bool
    let verificationNotes: String
}

// MARK: - Price Estimate
struct PriceEstimateRequest: Codable {
    let images: [String]
    let propertyType: String
    let squareMeters: Double?
    let professionId: String?
}

struct PriceEstimateResponse: Codable {
    let estimatedPrice: PriceRange
    let estimatedDuration: DurationRange
    let factors: [PriceFactor]
    let confidence: Double
}

struct PriceRange: Codable {
    let min: Double
    let max: Double
    let currency: String
}

struct DurationRange: Codable {
    let min: Int
    let max: Int
    let unit: String
}

struct PriceFactor: Codable, Identifiable {
    let factor: String
    let impact: String
    let description: String

    var id: String { factor }
}

// MARK: - Route Optimization
struct RouteOptimizeRequest: Codable {
    let bookings: [RouteBooking]
    let startLocation: Location?
    let endLocation: Location?
}

struct RouteBooking: Codable {
    let bookingId: String
    let address: String
    let latitude: Double
    let longitude: Double
    let scheduledTime: String
    let duration: Int
}

struct Location: Codable {
    let latitude: Double
    let longitude: Double
    let address: String?
}

struct RouteOptimizeResponse: Codable {
    let optimizedRoute: [RouteStop]
    let totalDistance: Double
    let totalTime: Int
    let savedTime: Int
    let savedDistance: Double
}

struct RouteStop: Codable, Identifiable {
    let order: Int
    let bookingId: String
    let address: String
    let arrivalTime: String
    let departureTime: String
    let travelTimeToNext: Int?
    let distanceToNext: Double?

    var id: Int { order }
}
