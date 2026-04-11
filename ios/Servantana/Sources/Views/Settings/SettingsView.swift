import SwiftUI

struct SettingsView: View {
    var body: some View {
        List {
            Section("Preferences") {
                NavigationLink { Text("Language Settings") } label: { Label("Language", systemImage: "globe") }
                NavigationLink { Text("Theme Settings") } label: { Label("Theme", systemImage: "paintbrush") }
            }
            Section("Security") {
                NavigationLink { Text("Change Password") } label: { Label("Change Password", systemImage: "lock") }
                NavigationLink { Text("Biometric Settings") } label: { Label("Face ID / Touch ID", systemImage: "faceid") }
            }
            Section("About") {
                HStack { Text("Version"); Spacer(); Text("1.0.0").foregroundStyle(.secondary) }
            }
        }
        .navigationTitle("Settings")
    }
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

struct CreateBookingView: View {
    let workerId: String
    @Environment(\.dismiss) var dismiss
    @State private var selectedDate = Date()
    @State private var selectedTime = "09:00"
    @State private var address = ""
    @State private var notes = ""

    var body: some View {
        Form {
            Section("Date & Time") {
                DatePicker("Date", selection: $selectedDate, displayedComponents: .date)
                Picker("Time", selection: $selectedTime) {
                    ForEach(["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"], id: \.self) { Text($0) }
                }
            }
            Section("Location") {
                TextField("Address", text: $address)
            }
            Section("Notes") {
                TextField("Any special instructions...", text: $notes, axis: .vertical).lineLimit(3...6)
            }
            Section {
                Button("Confirm Booking") { dismiss() }
                    .frame(maxWidth: .infinity)
                    .disabled(address.isEmpty)
            }
        }
        .navigationTitle("Book Service")
    }
}
