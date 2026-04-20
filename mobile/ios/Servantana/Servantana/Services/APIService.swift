import Foundation

enum APIError: Error {
    case invalidURL
    case noData
    case decodingError
    case serverError(String)
    case unauthorized
    case networkError(Error)
}

actor APIService {
    static let shared = APIService()

    private let baseURL = "https://servantana.com/api"
    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }

    private func getAuthToken() async -> String? {
        UserDefaults.standard.string(forKey: "authToken")
    }

    private func createRequest(path: String, method: String = "GET", body: Data? = nil) async throws -> URLRequest {
        guard let url = URL(string: "\(baseURL)/\(path)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = body
        }

        return request
    }

    private func perform<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.serverError("Invalid response")
        }

        if httpResponse.statusCode == 401 {
            throw APIError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorResponse = try? JSONDecoder().decode(Models.APIError.self, from: data) {
                throw APIError.serverError(errorResponse.error)
            }
            throw APIError.serverError("Server error: \(httpResponse.statusCode)")
        }

        do {
            let decoder = JSONDecoder()
            return try decoder.decode(T.self, from: data)
        } catch {
            print("Decoding error: \(error)")
            throw APIError.decodingError
        }
    }

    // MARK: - Auth

    func login(email: String, password: String) async throws -> AuthResponse {
        let body = try JSONEncoder().encode(LoginRequest(email: email, password: password))
        let request = try await createRequest(path: "auth/login", method: "POST", body: body)
        return try await perform(request)
    }

    func register(email: String, password: String, firstName: String, lastName: String, phone: String?, role: String) async throws -> AuthResponse {
        let registerRequest = RegisterRequest(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            role: role
        )
        let body = try JSONEncoder().encode(registerRequest)
        let request = try await createRequest(path: "auth/register", method: "POST", body: body)
        return try await perform(request)
    }

    func getSession() async throws -> User {
        let request = try await createRequest(path: "auth/session")
        return try await perform(request)
    }

    // MARK: - Services

    func getServices() async throws -> [Service] {
        let request = try await createRequest(path: "services")
        return try await perform(request)
    }

    // MARK: - Workers

    func getWorkers(serviceId: String? = nil, minRating: Double? = nil) async throws -> [Worker] {
        var path = "workers"
        var queryItems: [String] = []

        if let serviceId = serviceId {
            queryItems.append("serviceId=\(serviceId)")
        }
        if let minRating = minRating {
            queryItems.append("minRating=\(minRating)")
        }

        if !queryItems.isEmpty {
            path += "?" + queryItems.joined(separator: "&")
        }

        let request = try await createRequest(path: path)
        return try await perform(request)
    }

    func getWorker(id: String) async throws -> Worker {
        let request = try await createRequest(path: "workers/\(id)")
        return try await perform(request)
    }

    func getWorkerReviews(id: String) async throws -> [Review] {
        let request = try await createRequest(path: "workers/\(id)/reviews")
        return try await perform(request)
    }

    func getWorkerAvailability(id: String, date: String) async throws -> [String] {
        let request = try await createRequest(path: "workers/\(id)/availability?date=\(date)")
        return try await perform(request)
    }

    // MARK: - Bookings

    func getBookings(status: String? = nil) async throws -> BookingsListResponse {
        var path = "bookings"
        if let status = status {
            path += "?status=\(status)"
        }
        let request = try await createRequest(path: path)
        return try await perform(request)
    }

    func getBooking(id: String) async throws -> BookingResponse {
        let request = try await createRequest(path: "bookings/\(id)")
        return try await perform(request)
    }

    func createBooking(_ bookingRequest: CreateBookingRequest) async throws -> BookingResponse {
        let body = try JSONEncoder().encode(bookingRequest)
        let request = try await createRequest(path: "bookings", method: "POST", body: body)
        return try await perform(request)
    }

    func updateBookingStatus(id: String, status: String) async throws -> BookingResponse {
        let body = try JSONEncoder().encode(["status": status])
        let request = try await createRequest(path: "bookings/\(id)", method: "PATCH", body: body)
        return try await perform(request)
    }

    func cancelBooking(id: String, reason: String? = nil) async throws -> SuccessResponse {
        var bodyDict: [String: String] = [:]
        if let reason = reason {
            bodyDict["reason"] = reason
        }
        let body = try JSONEncoder().encode(bodyDict)
        let request = try await createRequest(path: "bookings/\(id)/cancel", method: "POST", body: body)
        return try await perform(request)
    }

    // MARK: - Tracking

    func getTracking(bookingId: String) async throws -> TrackingData {
        let request = try await createRequest(path: "bookings/\(bookingId)/tracking")
        return try await perform(request)
    }

    func updateTracking(bookingId: String, latitude: Double, longitude: Double, action: String? = nil) async throws -> SuccessResponse {
        let updateRequest = UpdateLocationRequest(latitude: latitude, longitude: longitude, action: action)
        let body = try JSONEncoder().encode(updateRequest)
        let request = try await createRequest(path: "bookings/\(bookingId)/tracking", method: "POST", body: body)
        return try await perform(request)
    }

    // MARK: - Messages

    func getConversations() async throws -> ConversationsResponse {
        let request = try await createRequest(path: "messages")
        return try await perform(request)
    }

    func getMessages(partnerId: String) async throws -> MessagesResponse {
        let request = try await createRequest(path: "messages/\(partnerId)")
        return try await perform(request)
    }

    func sendMessage(receiverId: String, content: String, bookingId: String? = nil) async throws -> Message {
        let messageRequest = SendMessageRequest(receiverId: receiverId, content: content, bookingId: bookingId)
        let body = try JSONEncoder().encode(messageRequest)
        let request = try await createRequest(path: "messages", method: "POST", body: body)
        return try await perform(request)
    }

    func markMessagesRead(partnerId: String) async throws -> SuccessResponse {
        let request = try await createRequest(path: "messages/\(partnerId)/read", method: "POST")
        return try await perform(request)
    }

    // MARK: - Profile

    func getProfile() async throws -> User {
        let request = try await createRequest(path: "user/profile")
        return try await perform(request)
    }

    func updateProfile(updates: [String: String]) async throws -> User {
        let body = try JSONEncoder().encode(updates)
        let request = try await createRequest(path: "user/profile", method: "PATCH", body: body)
        return try await perform(request)
    }

    // MARK: - Worker Profile

    func getWorkerProfile() async throws -> WorkerProfile {
        let request = try await createRequest(path: "worker/profile")
        return try await perform(request)
    }

    func getWorkerEarnings(period: String = "month") async throws -> [String: Any] {
        let request = try await createRequest(path: "worker/earnings?period=\(period)")
        let (data, _) = try await session.data(for: request)
        return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
    }
}
