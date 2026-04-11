import SwiftUI

struct EditProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phone = ""
    @State private var isSaving = false
    @State private var error: String?

    var body: some View {
        Form {
            Section("Personal Information") {
                TextField("First Name", text: $firstName)
                    .textContentType(.givenName)

                TextField("Last Name", text: $lastName)
                    .textContentType(.familyName)

                TextField("Phone", text: $phone)
                    .textContentType(.telephoneNumber)
                    .keyboardType(.phonePad)
            }

            Section {
                HStack {
                    Text("Email")
                    Spacer()
                    Text(authManager.currentUser?.email ?? "")
                        .foregroundStyle(.secondary)
                }
            } footer: {
                Text("Email cannot be changed")
            }

            if let error = error {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    saveProfile()
                }
                .disabled(isSaving || firstName.isEmpty || lastName.isEmpty)
            }
        }
        .onAppear {
            if let user = authManager.currentUser {
                firstName = user.firstName
                lastName = user.lastName
                phone = user.phone ?? ""
            }
        }
    }

    private func saveProfile() {
        isSaving = true
        error = nil

        Task {
            do {
                let request = UpdateProfileRequest(
                    firstName: firstName,
                    lastName: lastName,
                    phone: phone.isEmpty ? nil : phone
                )
                // Would call API here
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }
            isSaving = false
        }
    }
}

#Preview {
    NavigationStack {
        EditProfileView()
            .environmentObject(AuthManager.shared)
    }
}
