import SwiftUI

struct WorkerProfileSetupView: View {
    @EnvironmentObject var onboardingManager: WorkerOnboardingManager
    @State private var showingSaveAlert = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text("Create Your Profile")
                        .font(.title2.bold())

                    Text("Tell customers about yourself and your services")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal)

                // Form
                VStack(spacing: 20) {
                    // Name section
                    GroupBox("Personal Information") {
                        VStack(spacing: 16) {
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("First Name")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    TextField("First name", text: $onboardingManager.firstName)
                                        .textFieldStyle(.roundedBorder)
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Last Name")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    TextField("Last name", text: $onboardingManager.lastName)
                                        .textFieldStyle(.roundedBorder)
                                }
                            }

                            VStack(alignment: .leading, spacing: 4) {
                                Text("Phone Number")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                TextField("Phone number", text: $onboardingManager.phone)
                                    .textFieldStyle(.roundedBorder)
                                    .keyboardType(.phonePad)
                            }
                        }
                        .padding(.vertical, 8)
                    }

                    // Bio
                    GroupBox("About You") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Bio")
                                .font(.caption)
                                .foregroundColor(.secondary)

                            TextEditor(text: $onboardingManager.bio)
                                .frame(minHeight: 100)
                                .padding(8)
                                .background(Color(.systemGray6))
                                .cornerRadius(8)

                            Text("Describe your experience, skills, and what makes you stand out")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 8)
                    }

                    // Work details
                    GroupBox("Work Details") {
                        VStack(spacing: 16) {
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Hourly Rate (€)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    HStack {
                                        TextField("Rate", value: $onboardingManager.hourlyRate, format: .number)
                                            .textFieldStyle(.roundedBorder)
                                            .keyboardType(.decimalPad)
                                        Text("€/hr")
                                            .foregroundColor(.secondary)
                                    }
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Experience (Years)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Stepper(value: $onboardingManager.experienceYears, in: 0...50) {
                                        Text("\(onboardingManager.experienceYears)")
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                }
                            }

                            Toggle("Eco-Friendly Services", isOn: $onboardingManager.ecoFriendly)
                            Toggle("Pet-Friendly", isOn: $onboardingManager.petFriendly)
                        }
                        .padding(.vertical, 8)
                    }

                    // Location
                    GroupBox("Service Area") {
                        VStack(spacing: 16) {
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("City")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    TextField("City", text: $onboardingManager.city)
                                        .textFieldStyle(.roundedBorder)
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Country")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Picker("Country", selection: $onboardingManager.country) {
                                        Text("Germany").tag("DE")
                                        Text("Austria").tag("AT")
                                        Text("Switzerland").tag("CH")
                                        Text("Netherlands").tag("NL")
                                        Text("Belgium").tag("BE")
                                    }
                                    .pickerStyle(.menu)
                                }
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text("Service Radius: \(onboardingManager.serviceRadius) km")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Spacer()
                                }
                                Slider(value: Binding(
                                    get: { Double(onboardingManager.serviceRadius) },
                                    set: { onboardingManager.serviceRadius = Int($0) }
                                ), in: 5...100, step: 5)
                            }
                        }
                        .padding(.vertical, 8)
                    }
                }
                .padding(.horizontal)

                // Error message
                if let error = onboardingManager.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal)
                }

                // Continue button
                Button {
                    Task {
                        if await onboardingManager.saveProfile() {
                            onboardingManager.nextStep()
                        }
                    }
                } label: {
                    HStack {
                        if onboardingManager.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("Save & Continue")
                            Image(systemName: "arrow.right")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(isFormValid ? Color.blue : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(!isFormValid || onboardingManager.isLoading)
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
            .padding(.top)
        }
    }

    private var isFormValid: Bool {
        !onboardingManager.firstName.isEmpty &&
        !onboardingManager.lastName.isEmpty &&
        !onboardingManager.bio.isEmpty &&
        onboardingManager.hourlyRate > 0 &&
        !onboardingManager.city.isEmpty
    }
}

#Preview {
    WorkerProfileSetupView()
        .environmentObject(WorkerOnboardingManager.shared)
}
