import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutAlert = false

    var body: some View {
        NavigationStack {
            List {
                // Header
                if let user = authManager.currentUser {
                    Section {
                        HStack(spacing: 16) {
                            Circle()
                                .fill(Color.accentColor.opacity(0.1))
                                .frame(width: 80, height: 80)
                                .overlay(
                                    Text(user.initials)
                                        .font(.title)
                                        .fontWeight(.bold)
                                        .foregroundColor(.accentColor)
                                )

                            VStack(alignment: .leading, spacing: 4) {
                                Text(user.fullName)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text(user.email)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                if user.isWorker {
                                    Text("Service Provider")
                                        .font(.caption)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.accentColor)
                                        .foregroundColor(.white)
                                        .cornerRadius(4)
                                }
                            }
                        }
                        .padding(.vertical, 8)
                    }

                    // Profile Info
                    Section("Account") {
                        ProfileRow(icon: "envelope", label: "Email", value: user.email)
                        if let phone = user.phone {
                            ProfileRow(icon: "phone", label: "Phone", value: phone)
                        }
                        ProfileRow(icon: "person", label: "Account Type", value: user.isWorker ? "Service Provider" : "Customer")
                        ProfileRow(icon: "checkmark.seal", label: "Email Verified", value: user.isEmailVerified == true ? "Yes" : "No")
                    }
                }

                // Settings
                Section("Settings") {
                    NavigationLink(destination: Text("Notifications Settings")) {
                        Label("Notifications", systemImage: "bell")
                    }
                    NavigationLink(destination: Text("Privacy Settings")) {
                        Label("Privacy & Security", systemImage: "lock")
                    }
                    NavigationLink(destination: Text("Help")) {
                        Label("Help & Support", systemImage: "questionmark.circle")
                    }
                    NavigationLink(destination: Text("About")) {
                        Label("About", systemImage: "info.circle")
                    }
                }

                // Logout
                Section {
                    Button(action: { showLogoutAlert = true }) {
                        HStack {
                            Spacer()
                            Label("Log Out", systemImage: "rectangle.portrait.and.arrow.right")
                                .foregroundColor(.red)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Profile")
            .alert("Log Out?", isPresented: $showLogoutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Log Out", role: .destructive) {
                    Task {
                        await authManager.logout()
                    }
                }
            } message: {
                Text("Are you sure you want to log out of your account?")
            }
        }
    }
}

struct ProfileRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.accentColor)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(value)
            }
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager())
}
