import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutAlert = false

    var body: some View {
        NavigationStack {
            List {
                // Profile header
                Section {
                    HStack(spacing: 16) {
                        Circle()
                            .fill(Color(.systemGray4))
                            .frame(width: 70, height: 70)
                            .overlay {
                                Image(systemName: "person.fill")
                                    .font(.title)
                                    .foregroundStyle(.white)
                            }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(authManager.currentUser?.fullName ?? "User")
                                .font(.title3)
                                .fontWeight(.semibold)
                            Text(authManager.currentUser?.email ?? "")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // Account
                Section("Account") {
                    NavigationLink {
                        EditProfileView()
                    } label: {
                        Label("Personal Information", systemImage: "person")
                    }

                    NavigationLink {
                        FavoritesView()
                    } label: {
                        Label("Favorites", systemImage: "heart")
                    }

                    NavigationLink {
                        PropertiesView()
                    } label: {
                        Label("My Properties", systemImage: "house")
                    }
                }

                // Settings
                Section("Settings") {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Label("Settings", systemImage: "gear")
                    }

                    NavigationLink {
                        NotificationSettingsView()
                    } label: {
                        Label("Notifications", systemImage: "bell")
                    }
                }

                // Support
                Section("Support") {
                    NavigationLink {
                        Text("Help Center")
                    } label: {
                        Label("Help Center", systemImage: "questionmark.circle")
                    }

                    NavigationLink {
                        Text("About")
                    } label: {
                        Label("About", systemImage: "info.circle")
                    }
                }

                // Logout
                Section {
                    Button(role: .destructive) {
                        showLogoutAlert = true
                    } label: {
                        Label("Log Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Profile")
            .alert("Log Out", isPresented: $showLogoutAlert) {
                Button("Log Out", role: .destructive) {
                    Task {
                        await authManager.logout()
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Are you sure you want to log out?")
            }
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager.shared)
}
