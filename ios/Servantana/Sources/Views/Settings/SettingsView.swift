import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutConfirmation = false
    @State private var showLanguagePicker = false
    @State private var showThemePicker = false
    @State private var selectedLanguage = "en"
    @State private var selectedTheme = "system"

    var body: some View {
        List {
            // Account Section
            Section("Account") {
                NavigationLink {
                    NotificationSettingsView()
                } label: {
                    Label("Notifications", systemImage: "bell")
                }

                NavigationLink {
                    SecuritySettingsView()
                } label: {
                    Label("Security", systemImage: "lock")
                }
            }

            // Preferences Section
            Section("Preferences") {
                Button {
                    showLanguagePicker = true
                } label: {
                    HStack {
                        Label("Language", systemImage: "globe")
                        Spacer()
                        Text(languageDisplayName)
                            .foregroundStyle(.secondary)
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(.primary)

                Button {
                    showThemePicker = true
                } label: {
                    HStack {
                        Label("Theme", systemImage: "paintbrush")
                        Spacer()
                        Text(themeDisplayName)
                            .foregroundStyle(.secondary)
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(.primary)
            }

            // Support Section
            Section("Support") {
                Link(destination: URL(string: "https://servantana.com/help")!) {
                    HStack {
                        Label("Help Center", systemImage: "questionmark.circle")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(.primary)

                Link(destination: URL(string: "mailto:support@servantana.com")!) {
                    HStack {
                        Label("Contact Support", systemImage: "envelope")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(.primary)

                NavigationLink {
                    AboutView()
                } label: {
                    HStack {
                        Label("About", systemImage: "info.circle")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Legal Section
            Section("Legal") {
                Link(destination: URL(string: "https://servantana.com/terms")!) {
                    HStack {
                        Label("Terms of Service", systemImage: "doc.text")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(.primary)

                Link(destination: URL(string: "https://servantana.com/privacy")!) {
                    HStack {
                        Label("Privacy Policy", systemImage: "hand.raised")
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(.primary)
            }

            // Logout Section
            Section {
                Button(role: .destructive) {
                    showLogoutConfirmation = true
                } label: {
                    Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        }
        .navigationTitle("Settings")
        .confirmationDialog("Logout", isPresented: $showLogoutConfirmation) {
            Button("Logout", role: .destructive) {
                Task { await authManager.logout() }
            }
        } message: {
            Text("Are you sure you want to logout?")
        }
        .sheet(isPresented: $showLanguagePicker) {
            LanguagePickerView(selectedLanguage: $selectedLanguage, isPresented: $showLanguagePicker)
        }
        .sheet(isPresented: $showThemePicker) {
            ThemePickerView(selectedTheme: $selectedTheme, isPresented: $showThemePicker)
        }
    }

    private var languageDisplayName: String {
        switch selectedLanguage {
        case "en": return "English"
        case "de": return "Deutsch"
        case "es": return "Español"
        case "fr": return "Français"
        case "ka": return "ქართული"
        default: return "English"
        }
    }

    private var themeDisplayName: String {
        switch selectedTheme {
        case "light": return "Light"
        case "dark": return "Dark"
        default: return "System"
        }
    }
}

struct LanguagePickerView: View {
    @Binding var selectedLanguage: String
    @Binding var isPresented: Bool

    let languages = [
        ("en", "English"),
        ("de", "Deutsch"),
        ("es", "Español"),
        ("fr", "Français"),
        ("ka", "ქართული")
    ]

    var body: some View {
        NavigationStack {
            List {
                ForEach(languages, id: \.0) { code, name in
                    Button {
                        selectedLanguage = code
                        isPresented = false
                    } label: {
                        HStack {
                            Text(name)
                            Spacer()
                            if selectedLanguage == code {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.tint)
                            }
                        }
                    }
                    .foregroundStyle(.primary)
                }
            }
            .navigationTitle("Language")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
            }
        }
        .presentationDetents([.medium])
    }
}

struct ThemePickerView: View {
    @Binding var selectedTheme: String
    @Binding var isPresented: Bool

    let themes = [
        ("system", "System", "circle.lefthalf.filled"),
        ("light", "Light", "sun.max"),
        ("dark", "Dark", "moon")
    ]

    var body: some View {
        NavigationStack {
            List {
                ForEach(themes, id: \.0) { code, name, icon in
                    Button {
                        selectedTheme = code
                        isPresented = false
                    } label: {
                        HStack {
                            Label(name, systemImage: icon)
                            Spacer()
                            if selectedTheme == code {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.tint)
                            }
                        }
                    }
                    .foregroundStyle(.primary)
                }
            }
            .navigationTitle("Theme")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
            }
        }
        .presentationDetents([.height(250)])
    }
}

struct AboutView: View {
    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "house.fill")
                .font(.system(size: 64))
                .foregroundStyle(.tint)

            VStack(spacing: 8) {
                Text("Servantana")
                    .font(.title)
                    .fontWeight(.bold)

                Text("Version 1.0.0")
                    .foregroundStyle(.secondary)
            }

            Text("Find and book professional home services with AI-powered matching")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 32)

            Spacer()

            Text("© 2024 Servantana")
                .font(.footnote)
                .foregroundStyle(.secondary)

            Spacer()
        }
        .navigationTitle("About")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct SecuritySettingsView: View {
    @State private var biometricEnabled = false
    @State private var twoFactorEnabled = false
    @State private var showChangePassword = false
    @State private var showSignOutAllConfirmation = false

    var body: some View {
        List {
            Section("Password") {
                Button {
                    showChangePassword = true
                } label: {
                    Label("Change Password", systemImage: "key")
                }
                .foregroundStyle(.primary)
            }

            Section("Two-Factor Authentication") {
                Toggle(isOn: $twoFactorEnabled) {
                    Label("Enable 2FA", systemImage: "lock.shield")
                }
            }

            Section("Biometric Authentication") {
                Toggle(isOn: $biometricEnabled) {
                    Label("Face ID / Touch ID", systemImage: "faceid")
                }
            }

            Section("Sessions") {
                NavigationLink {
                    ActiveSessionsView()
                } label: {
                    Label("Active Sessions", systemImage: "laptopcomputer.and.iphone")
                }

                Button(role: .destructive) {
                    showSignOutAllConfirmation = true
                } label: {
                    Label("Sign Out All Devices", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        }
        .navigationTitle("Security")
        .sheet(isPresented: $showChangePassword) {
            ChangePasswordView(isPresented: $showChangePassword)
        }
        .confirmationDialog("Sign Out All Devices?", isPresented: $showSignOutAllConfirmation) {
            Button("Sign Out All", role: .destructive) {
                // Sign out all devices
            }
        } message: {
            Text("This will sign you out from all devices except this one.")
        }
    }
}

struct ChangePasswordView: View {
    @Binding var isPresented: Bool
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    SecureField("Current Password", text: $currentPassword)
                    SecureField("New Password", text: $newPassword)
                    SecureField("Confirm New Password", text: $confirmPassword)
                } footer: {
                    Text("Password must be at least 8 characters")
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Button {
                        changePassword()
                    } label: {
                        HStack {
                            Spacer()
                            if isLoading {
                                ProgressView()
                            } else {
                                Text("Change Password")
                            }
                            Spacer()
                        }
                    }
                    .disabled(isLoading || !isValid)
                }
            }
            .navigationTitle("Change Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
            }
        }
    }

    private var isValid: Bool {
        !currentPassword.isEmpty && newPassword.count >= 8 && newPassword == confirmPassword
    }

    private func changePassword() {
        guard isValid else {
            if newPassword != confirmPassword {
                errorMessage = "Passwords don't match"
            } else if newPassword.count < 8 {
                errorMessage = "Password must be at least 8 characters"
            }
            return
        }

        isLoading = true
        // API call would go here
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isLoading = false
            isPresented = false
        }
    }
}

struct ActiveSessionsView: View {
    @State private var sessions: [SessionInfo] = [
        SessionInfo(id: "1", deviceName: "This iPhone", deviceType: "mobile", location: "Current Location", lastActive: "Now", isCurrent: true),
        SessionInfo(id: "2", deviceName: "Chrome on Windows", deviceType: "desktop", location: "Berlin, Germany", lastActive: "2 hours ago", isCurrent: false),
        SessionInfo(id: "3", deviceName: "Android Phone", deviceType: "mobile", location: "Tbilisi, Georgia", lastActive: "Yesterday", isCurrent: false)
    ]

    var body: some View {
        List {
            ForEach(sessions) { session in
                HStack {
                    Image(systemName: session.deviceType == "mobile" ? "iphone" : "desktopcomputer")
                        .foregroundStyle(session.isCurrent ? .tint : .secondary)
                        .frame(width: 30)

                    VStack(alignment: .leading, spacing: 2) {
                        HStack {
                            Text(session.deviceName)
                                .fontWeight(.medium)
                            if session.isCurrent {
                                Text("Current")
                                    .font(.caption)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.accentColor.opacity(0.2))
                                    .clipShape(Capsule())
                            }
                        }
                        Text("\(session.location) • \(session.lastActive)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Active Sessions")
    }
}

struct SessionInfo: Identifiable {
    let id: String
    let deviceName: String
    let deviceType: String
    let location: String
    let lastActive: String
    let isCurrent: Bool
}

struct NotificationSettingsView: View {
    @State private var pushEnabled = true
    @State private var emailEnabled = true
    @State private var bookingUpdates = true
    @State private var messages = true
    @State private var promotions = false

    var body: some View {
        List {
            Section("General") {
                Toggle("Push Notifications", isOn: $pushEnabled)
                Toggle("Email Notifications", isOn: $emailEnabled)
            }
            Section("Activity") {
                Toggle("Booking Updates", isOn: $bookingUpdates)
                Toggle("Messages", isOn: $messages)
            }
            Section("Marketing") {
                Toggle("Promotions & Offers", isOn: $promotions)
            }
        }
        .navigationTitle("Notifications")
    }
}

struct PropertiesView: View {
    @State private var properties: [(id: String, name: String, address: String)] = [
        ("1", "Home", "123 Main Street, Berlin"),
        ("2", "Office", "456 Business Park, Berlin")
    ]

    var body: some View {
        List {
            ForEach(properties, id: \.id) { property in
                VStack(alignment: .leading) {
                    Text(property.name).font(.headline)
                    Text(property.address).font(.subheadline).foregroundStyle(.secondary)
                }
            }
            .onDelete { _ in }
        }
        .navigationTitle("My Properties")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { } label: { Image(systemName: "plus") }
            }
        }
    }
}
