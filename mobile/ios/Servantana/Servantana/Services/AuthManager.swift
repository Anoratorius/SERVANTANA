import Foundation
import SwiftUI

enum AuthState: Equatable {
    case loading
    case authenticated(User)
    case unauthenticated
}

@MainActor
class AuthManager: ObservableObject {
    @Published var authState: AuthState = .loading
    @Published var currentUser: User?

    private let tokenKey = "authToken"
    private let userKey = "currentUser"

    init() {
        checkAuthStatus()
    }

    func checkAuthStatus() {
        if let token = UserDefaults.standard.string(forKey: tokenKey),
           !token.isEmpty,
           let userData = UserDefaults.standard.data(forKey: userKey),
           let user = try? JSONDecoder().decode(User.self, from: userData) {
            self.currentUser = user
            self.authState = .authenticated(user)

            // Refresh session in background
            Task {
                await refreshSession()
            }
        } else {
            self.authState = .unauthenticated
        }
    }

    private func refreshSession() async {
        do {
            let user = try await APIService.shared.getSession()
            await MainActor.run {
                self.currentUser = user
                self.authState = .authenticated(user)
                self.saveUser(user)
            }
        } catch {
            print("Session refresh failed: \(error)")
            // Only logout if unauthorized, not for network errors
            if case APIError.unauthorized = error {
                await logout()
            }
        }
    }

    func login(email: String, password: String) async throws {
        let response = try await APIService.shared.login(email: email, password: password)
        saveToken(response.token)
        saveUser(response.user)
        self.currentUser = response.user
        self.authState = .authenticated(response.user)
    }

    func register(email: String, password: String, firstName: String, lastName: String, phone: String?, isWorker: Bool) async throws {
        let role = isWorker ? "CLEANER" : "CUSTOMER"
        let response = try await APIService.shared.register(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            role: role
        )
        saveToken(response.token)
        saveUser(response.user)
        self.currentUser = response.user
        self.authState = .authenticated(response.user)
    }

    func logout() async {
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: userKey)
        self.currentUser = nil
        self.authState = .unauthenticated
    }

    private func saveToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: tokenKey)
    }

    private func saveUser(_ user: User) {
        if let userData = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(userData, forKey: userKey)
        }
    }
}
