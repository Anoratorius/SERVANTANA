import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authManager: AuthManager

    @State private var email = ""
    @State private var isLoading = false
    @State private var emailSent = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if emailSent {
                    successContent
                } else {
                    formContent
                }
            }
            .padding(24)
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var formContent: some View {
        VStack(spacing: 24) {
            // Icon
            Image(systemName: "envelope.badge.shield.half.filled")
                .font(.system(size: 60))
                .foregroundStyle(.blue)

            // Description
            VStack(spacing: 8) {
                Text("Forgot Password?")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Enter your email and we'll send you instructions to reset your password.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Email field
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

            // Error
            if let error = errorMessage {
                Text(error)
                    .font(.subheadline)
                    .foregroundStyle(.red)
            }

            // Submit button
            Button {
                sendResetEmail()
            } label: {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Send Reset Link")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.accentColor)
            .foregroundStyle(.white)
            .cornerRadius(12)
            .disabled(isLoading || email.isEmpty)

            Spacer()
        }
    }

    private var successContent: some View {
        VStack(spacing: 24) {
            // Icon
            Image(systemName: "envelope.open.fill")
                .font(.system(size: 60))
                .foregroundStyle(.green)

            // Message
            VStack(spacing: 8) {
                Text("Check Your Email")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("We've sent password reset instructions to:")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text(email)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.blue)

                Text("If you don't see the email, check your spam folder.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.top, 8)
            }
            .multilineTextAlignment(.center)

            // Done button
            Button {
                dismiss()
            } label: {
                Text("Back to Login")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.accentColor)
            .foregroundStyle(.white)
            .cornerRadius(12)

            Spacer()
        }
    }

    private func sendResetEmail() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await authManager.forgotPassword(email: email)
                emailSent = true
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

#Preview {
    ForgotPasswordView()
        .environmentObject(AuthManager.shared)
}
