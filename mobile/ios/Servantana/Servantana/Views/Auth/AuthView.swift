import SwiftUI

struct AuthView: View {
    @State private var showingLogin = true

    var body: some View {
        NavigationStack {
            if showingLogin {
                LoginView(showingLogin: $showingLogin)
            } else {
                RegisterView(showingLogin: $showingLogin)
            }
        }
    }
}

struct LoginView: View {
    @Binding var showingLogin: Bool
    @EnvironmentObject var authManager: AuthManager

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showPassword = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer()
                    .frame(height: 40)

                // Header
                VStack(spacing: 8) {
                    Text("Welcome Back")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Log in to your Servantana account")
                        .foregroundColor(.secondary)
                }

                Spacer()
                    .frame(height: 32)

                // Form
                VStack(spacing: 16) {
                    // Email
                    HStack {
                        Image(systemName: "envelope")
                            .foregroundColor(.secondary)
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
                            .foregroundColor(.secondary)
                        if showPassword {
                            TextField("Password", text: $password)
                        } else {
                            SecureField("Password", text: $password)
                        }
                        Button(action: { showPassword.toggle() }) {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Forgot Password
                    HStack {
                        Spacer()
                        Button("Forgot Password?") {
                            // TODO
                        }
                        .font(.subheadline)
                    }
                }

                // Error
                if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.subheadline)
                }

                // Login Button
                Button(action: login) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Log In")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(isFormValid ? Color.accentColor : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(12)
                .disabled(!isFormValid || isLoading)

                Spacer()

                // Register link
                HStack {
                    Text("Don't have an account?")
                        .foregroundColor(.secondary)
                    Button("Sign Up") {
                        showingLogin = false
                    }
                    .fontWeight(.semibold)
                }
            }
            .padding(24)
        }
        .navigationBarHidden(true)
    }

    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty
    }

    private func login() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authManager.login(email: email, password: password)
            } catch APIError.serverError(let message) {
                errorMessage = message
            } catch {
                errorMessage = "Login failed. Please try again."
            }
            isLoading = false
        }
    }
}

struct RegisterView: View {
    @Binding var showingLogin: Bool
    @EnvironmentObject var authManager: AuthManager

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isWorker = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showPassword = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Spacer()
                    .frame(height: 20)

                // Header
                VStack(spacing: 8) {
                    Text("Create Account")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Join Servantana today")
                        .foregroundColor(.secondary)
                }

                // Form
                VStack(spacing: 16) {
                    // Name fields
                    HStack(spacing: 12) {
                        HStack {
                            Image(systemName: "person")
                                .foregroundColor(.secondary)
                            TextField("First Name", text: $firstName)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)

                        HStack {
                            TextField("Last Name", text: $lastName)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }

                    // Email
                    HStack {
                        Image(systemName: "envelope")
                            .foregroundColor(.secondary)
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Phone
                    HStack {
                        Image(systemName: "phone")
                            .foregroundColor(.secondary)
                        TextField("Phone (optional)", text: $phone)
                            .keyboardType(.phonePad)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Password
                    HStack {
                        Image(systemName: "lock")
                            .foregroundColor(.secondary)
                        if showPassword {
                            TextField("Password", text: $password)
                        } else {
                            SecureField("Password", text: $password)
                        }
                        Button(action: { showPassword.toggle() }) {
                            Image(systemName: showPassword ? "eye.slash" : "eye")
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Confirm Password
                    HStack {
                        Image(systemName: "lock")
                            .foregroundColor(.secondary)
                        SecureField("Confirm Password", text: $confirmPassword)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    if !confirmPassword.isEmpty && password != confirmPassword {
                        Text("Passwords do not match")
                            .foregroundColor(.red)
                            .font(.caption)
                    }

                    // Worker toggle
                    Toggle(isOn: $isWorker) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Register as Service Provider")
                                .fontWeight(.medium)
                            Text("Offer your professional services")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                }

                // Error
                if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.subheadline)
                }

                // Register Button
                Button(action: register) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Sign Up")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(isFormValid ? Color.accentColor : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(12)
                .disabled(!isFormValid || isLoading)

                // Login link
                HStack {
                    Text("Already have an account?")
                        .foregroundColor(.secondary)
                    Button("Log In") {
                        showingLogin = true
                    }
                    .fontWeight(.semibold)
                }

                Spacer()
                    .frame(height: 24)
            }
            .padding(24)
        }
        .navigationBarHidden(true)
    }

    private var isFormValid: Bool {
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !email.isEmpty &&
        !password.isEmpty &&
        password == confirmPassword &&
        password.count >= 8
    }

    private func register() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authManager.register(
                    email: email,
                    password: password,
                    firstName: firstName,
                    lastName: lastName,
                    phone: phone.isEmpty ? nil : phone,
                    isWorker: isWorker
                )
            } catch APIError.serverError(let message) {
                errorMessage = message
            } catch {
                errorMessage = "Registration failed. Please try again."
            }
            isLoading = false
        }
    }
}

#Preview {
    AuthView()
        .environmentObject(AuthManager())
}
