import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int, String?)
    case decodingError(Error)
    case networkError(Error)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code, let message):
            return message ?? "HTTP Error: \(code)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .networkError(let error):
            return error.localizedDescription
        case .unauthorized:
            return "Session expired. Please login again."
        }
    }
}

actor APIClient {
    static let shared = APIClient()

    private let baseURL = "https://servantana.com/api"
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        session = URLSession(configuration: config)

        decoder = JSONDecoder()
        encoder = JSONEncoder()
    }

    private func getAuthToken() -> String? {
        KeychainManager.shared.getToken()
    }

    func request<T: Decodable>(
        _ endpoint: String,
        method: String = "GET",
        body: Encodable? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)/\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if requiresAuth, let token = getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try encoder.encode(body)
        }

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            if httpResponse.statusCode == 401 {
                throw APIError.unauthorized
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                let errorMessage = String(data: data, encoding: .utf8)
                throw APIError.httpError(httpResponse.statusCode, errorMessage)
            }

            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingError(error)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Auth
    func login(email: String, password: String) async throws -> AuthResponse {
        let body = LoginRequest(email: email, password: password, rememberMe: true)
        return try await request("auth/login", method: "POST", body: body, requiresAuth: false)
    }

    func register(email: String, password: String, firstName: String, lastName: String) async throws -> AuthResponse {
        let body = RegisterRequest(email: email, password: password, firstName: firstName, lastName: lastName, role: "CUSTOMER")
        return try await request("auth/register", method: "POST", body: body, requiresAuth: false)
    }

    func logout() async throws {
        let _: ApiResponse = try await request("auth/logout", method: "POST")
    }

    func getCurrentUser() async throws -> UserResponse {
        try await request("user/me")
    }

    func forgotPassword(email: String) async throws -> ApiResponse {
        let body = PasswordResetRequest(email: email)
        return try await request("auth/forgot-password", method: "POST", body: body, requiresAuth: false)
    }

    // MARK: - Workers
    func getWorkers(
        latitude: Double? = nil,
        longitude: Double? = nil,
        maxDistance: Int? = nil,
        professionId: String? = nil,
        categoryId: String? = nil
    ) async throws -> WorkersResponse {
        var params: [String] = []
        if let lat = latitude { params.append("lat=\(lat)") }
        if let lng = longitude { params.append("lng=\(lng)") }
        if let dist = maxDistance { params.append("maxDistance=\(dist)") }
        if let prof = professionId { params.append("professionId=\(prof)") }
        if let cat = categoryId { params.append("categoryId=\(cat)") }

        let query = params.isEmpty ? "" : "?\(params.joined(separator: "&"))"
        return try await request("workers\(query)")
    }

    func getWorker(id: String) async throws -> WorkerDetailResponse {
        try await request("workers/\(id)")
    }

    // MARK: - Bookings
    func getBookings(status: String? = nil) async throws -> BookingsResponse {
        let query = status != nil ? "?status=\(status!)" : ""
        return try await request("bookings\(query)")
    }

    func getBooking(id: String) async throws -> BookingResponse {
        try await request("bookings/\(id)")
    }

    func createBooking(_ booking: CreateBookingRequest) async throws -> BookingResponse {
        try await request("bookings", method: "POST", body: booking)
    }

    func cancelBooking(id: String, reason: String?) async throws -> BookingResponse {
        let body = CancelBookingRequest(reason: reason)
        return try await request("bookings/\(id)/cancel", method: "POST", body: body)
    }

    // MARK: - Messages
    func getConversations() async throws -> ConversationsResponse {
        try await request("messages")
    }

    func getMessages(conversationId: String, limit: Int = 50) async throws -> MessagesResponse {
        try await request("messages/\(conversationId)?limit=\(limit)")
    }

    func sendMessage(_ message: SendMessageRequest) async throws -> MessageResponse {
        try await request("messages", method: "POST", body: message)
    }

    // MARK: - Favorites
    func getFavorites() async throws -> FavoritesResponse {
        try await request("favorites")
    }

    func addFavorite(workerId: String) async throws -> ApiResponse {
        let body = AddFavoriteRequest(cleanerId: workerId)
        return try await request("favorites", method: "POST", body: body)
    }

    func removeFavorite(workerId: String) async throws -> ApiResponse {
        try await request("favorites/\(workerId)", method: "DELETE")
    }

    // MARK: - Reviews
    func getWorkerReviews(workerId: String) async throws -> ReviewsResponse {
        try await request("reviews/worker/\(workerId)")
    }

    func createReview(_ review: CreateReviewRequest) async throws -> ReviewResponse {
        try await request("reviews", method: "POST", body: review)
    }

    // MARK: - Categories
    func getCategories() async throws -> CategoriesResponse {
        try await request("categories")
    }

    func getProfessions(categoryId: String? = nil) async throws -> ProfessionsResponse {
        let query = categoryId != nil ? "?categoryId=\(categoryId!)" : ""
        return try await request("professions\(query)")
    }

    // MARK: - AI Features
    func aiChat(_ request: AIChatRequest) async throws -> AIChatResponse {
        try await self.request("ai/chat", method: "POST", body: request)
    }

    func smartMatch(_ request: SmartMatchRequest) async throws -> SmartMatchResponse {
        try await self.request("ai/smart-match", method: "POST", body: request)
    }

    func smartSchedule(_ request: SmartScheduleRequest) async throws -> SmartScheduleResponse {
        try await self.request("ai/schedule", method: "POST", body: request)
    }

    func reviewInsights(_ request: ReviewInsightsRequest) async throws -> ReviewInsightsResponse {
        try await self.request("ai/reviews", method: "POST", body: request)
    }

    func analyzePhoto(_ request: PhotoAnalysisRequest) async throws -> PhotoAnalysisResponse {
        try await self.request("ai/photo", method: "POST", body: request)
    }

    func estimatePrice(_ request: PriceEstimateRequest) async throws -> PriceEstimateResponse {
        try await self.request("ai/estimate", method: "POST", body: request)
    }

    func optimizeRoute(_ request: RouteOptimizeRequest) async throws -> RouteOptimizeResponse {
        try await self.request("ai/route-optimize", method: "POST", body: request)
    }

    // MARK: - Worker Profile

    func registerAsWorker(email: String, password: String, firstName: String, lastName: String) async throws -> AuthResponse {
        let body = RegisterRequest(email: email, password: password, firstName: firstName, lastName: lastName, role: "WORKER")
        return try await request("auth/register", method: "POST", body: body, requiresAuth: false)
    }

    func getWorkerProfile() async throws -> WorkerProfileResponse {
        try await request("worker/profile")
    }

    func updateWorkerProfile(_ profile: WorkerProfileUpdateRequest) async throws -> WorkerProfileUpdateResponse {
        try await request("worker/profile", method: "PUT", body: profile)
    }

    func completeOnboarding() async throws -> OnboardingCompleteResponse {
        try await request("worker/profile", method: "POST")
    }

    // MARK: - Worker Professions

    func getWorkerProfessions() async throws -> WorkerProfessionsResponse {
        try await request("worker/professions")
    }

    func addWorkerProfession(professionId: String, isPrimary: Bool) async throws -> WorkerProfessionsResponse {
        let body = AddProfessionRequest(professionId: professionId, isPrimary: isPrimary)
        return try await request("worker/professions", method: "POST", body: body)
    }

    func removeWorkerProfession(professionId: String) async throws -> ApiResponse {
        try await request("worker/professions?professionId=\(professionId)", method: "DELETE")
    }

    func setPrimaryProfession(professionId: String) async throws -> WorkerProfessionsResponse {
        let body = UpdatePrimaryProfessionRequest(professionId: professionId)
        return try await request("worker/professions", method: "PUT", body: body)
    }

    // MARK: - Worker Availability

    func getWorkerAvailability() async throws -> AvailabilityResponse {
        try await request("worker/availability")
    }

    func setWorkerAvailability(_ availability: SetAvailabilityRequest) async throws -> AvailabilityResponse {
        try await request("worker/availability", method: "PUT", body: availability)
    }

    // MARK: - Worker Documents

    func getWorkerDocuments() async throws -> DocumentsResponse {
        try await request("worker/documents")
    }

    func uploadDocument(data: Data, fileName: String, mimeType: String, type: DocumentType, expiresAt: Date? = nil) async throws -> DocumentUploadResponse {
        guard let url = URL(string: "\(baseURL)/worker/documents") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"

        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let token = getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var body = Data()

        // Add file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n".data(using: .utf8)!)

        // Add type
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"type\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(type.rawValue)\r\n".data(using: .utf8)!)

        // Add expiresAt if provided
        if let expiresAt = expiresAt {
            let formatter = ISO8601DateFormatter()
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"expiresAt\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(formatter.string(from: expiresAt))\r\n".data(using: .utf8)!)
        }

        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (responseData, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: responseData, encoding: .utf8)
            throw APIError.httpError(httpResponse.statusCode, errorMessage)
        }

        return try decoder.decode(DocumentUploadResponse.self, from: responseData)
    }

    func deleteDocument(id: String) async throws -> ApiResponse {
        try await request("worker/documents/\(id)", method: "DELETE")
    }

    // MARK: - Stripe Connect

    func getStripeConnectStatus() async throws -> StripeConnectStatus {
        try await request("stripe/connect")
    }

    func createStripeConnectAccount(country: String = "DE") async throws -> StripeConnectLinkResponse {
        struct CreateAccountRequest: Codable {
            let country: String
        }
        return try await request("stripe/connect", method: "POST", body: CreateAccountRequest(country: country))
    }

    func refreshStripeOnboardingLink() async throws -> StripeConnectLinkResponse {
        struct RefreshRequest: Codable {
            let action: String
        }
        return try await request("stripe/connect", method: "PUT", body: RefreshRequest(action: "refresh"))
    }

    func checkStripeConnectStatus() async throws -> StripeConnectStatus {
        struct CheckRequest: Codable {
            let action: String
        }
        return try await request("stripe/connect", method: "PUT", body: CheckRequest(action: "check"))
    }

    // MARK: - Location

    func updateUserLocation(latitude: Double, longitude: Double, city: String?, country: String?) async throws -> LocationResponse {
        let body = UpdateLocationRequest(latitude: latitude, longitude: longitude, city: city, country: country)
        return try await request("user/location", method: "POST", body: body)
    }

    func getUserLocation() async throws -> UserLocationResponse {
        try await request("user/location")
    }

    func updateWorkerLocation(latitude: Double, longitude: Double) async throws -> WorkerLocationResponse {
        struct WorkerLocationRequest: Codable {
            let latitude: Double
            let longitude: Double
        }
        return try await request("worker/location", method: "POST", body: WorkerLocationRequest(latitude: latitude, longitude: longitude))
    }

    func getWorkerLocation() async throws -> WorkerLocationDetailResponse {
        try await request("worker/location")
    }

    // MARK: - Booking ETA

    func updateBookingETA(bookingId: String, status: String, latitude: Double? = nil, longitude: Double? = nil, estimatedArrival: String? = nil) async throws -> BookingETAResponse {
        struct ETAUpdateRequest: Codable {
            let status: String
            let latitude: Double?
            let longitude: Double?
            let estimatedArrival: String?
        }
        return try await request(
            "bookings/\(bookingId)/eta",
            method: "POST",
            body: ETAUpdateRequest(status: status, latitude: latitude, longitude: longitude, estimatedArrival: estimatedArrival)
        )
    }

    func getBookingETA(bookingId: String) async throws -> BookingETADetailResponse {
        try await request("bookings/\(bookingId)/eta")
    }
}

// MARK: - Location Response Models

struct UserLocationResponse: Codable {
    let latitude: Double?
    let longitude: Double?
    let city: String?
    let country: String?
    let verifiedAt: String?
    let isVerified: Bool
}

struct WorkerLocationDetailResponse: Codable {
    let location: WorkerLocationInfo

    struct WorkerLocationInfo: Codable {
        let latitude: Double?
        let longitude: Double?
        let city: String?
        let country: String?
        let serviceRadius: Int?
        let availableNow: Bool?
        let lastUpdated: String?
    }
}

struct BookingETAResponse: Codable {
    let message: String
    let booking: ETABookingInfo

    struct ETABookingInfo: Codable {
        let id: String
        let status: String
        let etaStatus: String
        let estimatedArrival: String?
        let workerLocation: WorkerCoordinates?

        struct WorkerCoordinates: Codable {
            let latitude: Double
            let longitude: Double
        }
    }
}

struct BookingETADetailResponse: Codable {
    let booking: BookingInfo
    let worker: WorkerInfo?
    let eta: ETAInfo
    let customerLocation: CustomerLocationInfo?

    struct BookingInfo: Codable {
        let id: String
        let status: String
        let scheduledDate: String
        let scheduledTime: String
    }

    struct WorkerInfo: Codable {
        let id: String
        let firstName: String
        let lastName: String
        let avatar: String?
        let location: WorkerLocationCoords?

        struct WorkerLocationCoords: Codable {
            let latitude: Double
            let longitude: Double
            let lastUpdated: String?
        }
    }

    struct ETAInfo: Codable {
        let status: String?
        let distanceKm: Double?
        let estimatedMinutes: Int?
    }

    struct CustomerLocationInfo: Codable {
        let latitude: Double
        let longitude: Double
        let address: String?
    }
}
