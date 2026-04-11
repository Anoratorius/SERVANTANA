import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let avatar: String?
    let role: UserRole
    let phone: String?
    let isEmailVerified: Bool
    let locationCity: String?
    let locationCountry: String?

    var fullName: String {
        "\(firstName) \(lastName)"
    }

    enum CodingKeys: String, CodingKey {
        case id, email, firstName, lastName, avatar, role, phone
        case isEmailVerified, locationCity, locationCountry
    }
}

enum UserRole: String, Codable {
    case customer = "CUSTOMER"
    case worker = "WORKER"
    case admin = "ADMIN"
}

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct UserResponse: Codable {
    let user: User
}

struct LoginRequest: Codable {
    let email: String
    let password: String
    let rememberMe: Bool
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let firstName: String
    let lastName: String
    let role: String
}

struct UpdateProfileRequest: Codable {
    let firstName: String?
    let lastName: String?
    let phone: String?
}

struct PasswordResetRequest: Codable {
    let email: String
}

struct ApiResponse: Codable {
    let success: Bool
    let message: String?
}
