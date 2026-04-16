import Foundation
import SwiftUI

@MainActor
class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false

    private init() {
        checkAuthState()
    }

    private func checkAuthState() {
        if let _ = KeychainManager.shared.getToken() {
            isAuthenticated = true
            Task {
                await loadCurrentUser()
            }
        }
    }

    func login(email: String, password: String) async throws {
        isLoading = true
        defer { isLoading = false }

        let response = try await APIClient.shared.login(email: email, password: password)
        KeychainManager.shared.saveToken(response.token)
        currentUser = response.user
        isAuthenticated = true
    }

    func register(email: String, password: String, firstName: String, lastName: String) async throws {
        isLoading = true
        defer { isLoading = false }

        let response = try await APIClient.shared.register(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName
        )
        KeychainManager.shared.saveToken(response.token)
        currentUser = response.user
        isAuthenticated = true
    }

    func registerAsWorker(email: String, password: String, firstName: String, lastName: String) async throws {
        isLoading = true
        defer { isLoading = false }

        let response = try await APIClient.shared.registerAsWorker(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName
        )
        KeychainManager.shared.saveToken(response.token)
        currentUser = response.user
        isAuthenticated = true
    }

    func logout() async {
        isLoading = true
        defer { isLoading = false }

        try? await APIClient.shared.logout()
        KeychainManager.shared.deleteToken()
        currentUser = nil
        isAuthenticated = false
    }

    func loadCurrentUser() async {
        do {
            let response = try await APIClient.shared.getCurrentUser()
            currentUser = response.user
        } catch {
            // If we can't load the user, the token might be invalid
            if case APIError.unauthorized = error {
                await logout()
            }
        }
    }

    func forgotPassword(email: String) async throws {
        isLoading = true
        defer { isLoading = false }

        _ = try await APIClient.shared.forgotPassword(email: email)
    }
}
