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
}
