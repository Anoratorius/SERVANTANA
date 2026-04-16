import SwiftUI

struct SignUpView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var showPassword = false
    @State private var errorMessage: String?
    @State private var isWorker = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Create Account")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Join Servantana today")
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 20)

                // Account type selector
                VStack(spacing: 8) {
                    Text("I want to...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    HStack(spacing: 12) {
                        AccountTypeButton(
                            title: "Find Services",
                            subtitle: "Book professionals",
                            icon: "magnifyingglass",
                            isSelected: !isWorker
                        ) {
                            isWorker = false
                        }

                        AccountTypeButton(
                            title: "Offer Services",
                            subtitle: "Become a pro",
                            icon: "briefcase.fill",
                            isSelected: isWorker
                        ) {
                            isWorker = true
                        }
                    }
                }
                .padding(.bottom, 8)

                // Form
                VStack(spacing: 16) {
                    // Name row
                    HStack(spacing: 12) {
                        HStack {
                            Image(systemName: "person")
                                .foregroundStyle(.secondary)
                            TextField("First Name", text: $firstName)
                                .textContentType(.givenName)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)

                        HStack {
                            TextField("Last Name", text: $lastName)
                                .textContentType(.familyName)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }

                    // Email
                    HStack {
                        Image(systemName: "envelope")
                            .foregroundStyle(.secondary)
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Password
                    HStack {
                        Image(systemName: "lock")
                            .foregroundStyle(.secondary)
                        if showPassword {
                            TextField("Password", text: $password)
                        } else {
                            SecureField("Password", text: $password)
                        }
                        Button {
                            showPassword.toggle()
                        } label: {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Confirm Password
                    HStack {
                        Image(systemName: "lock")
                            .foregroundStyle(.secondary)
                        SecureField("Confirm Password", text: $confirmPassword)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }

                // Error message
                if let error = errorMessage {
                    Text(error)
                        .font(.subheadline)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                // Sign up button
                Button {
                    signUp()
                } label: {
                    if authManager.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Create Account")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.accentColor)
                .foregroundStyle(.white)
                .cornerRadius(12)
                .disabled(authManager.isLoading || !isFormValid)

                // Terms
                Text("By creating an account, you agree to our Terms of Service and Privacy Policy")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Spacer()
            }
            .padding(24)
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private var isFormValid: Bool {
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !email.isEmpty &&
        password.count >= 8 &&
        password == confirmPassword
    }

    private func signUp() {
        errorMessage = nil

        guard password == confirmPassword else {
            errorMessage = "Passwords don't match"
            return
        }

        guard password.count >= 8 else {
            errorMessage = "Password must be at least 8 characters"
            return
        }

        Task {
            do {
                if isWorker {
                    try await authManager.registerAsWorker(
                        email: email,
                        password: password,
                        firstName: firstName,
                        lastName: lastName
                    )
                } else {
                    try await authManager.register(
                        email: email,
                        password: password,
                        firstName: firstName,
                        lastName: lastName
                    )
                }
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

struct AccountTypeButton: View {
    let title: String
    let subtitle: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(isSelected ? .white : .blue)

                VStack(spacing: 2) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
            )
        }
    }
}

#Preview {
    NavigationStack {
        SignUpView()
            .environmentObject(AuthManager.shared)
    }
}
