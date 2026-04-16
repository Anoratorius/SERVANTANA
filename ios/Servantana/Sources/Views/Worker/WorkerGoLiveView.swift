import SwiftUI

struct WorkerGoLiveView: View {
    @EnvironmentObject var onboardingManager: WorkerOnboardingManager
    @EnvironmentObject var authManager: AuthManager
    @State private var showingConfirmation = false
    @State private var isGoingLive = false
    @State private var onboardingSuccess = false

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 24) {
                    // Success header
                    if onboardingSuccess {
                        SuccessView()
                    } else {
                        // Review header
                        VStack(spacing: 16) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.green)

                            Text("Ready to Go Live!")
                                .font(.title2.bold())

                            Text("Review your setup below. Once you go live, customers will be able to find and book you.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()

                        // Setup summary
                        VStack(spacing: 16) {
                            SetupSummaryRow(
                                title: "Profile",
                                subtitle: onboardingManager.bio.isEmpty ? "Not set" : "Complete",
                                isComplete: onboardingManager.profileComplete,
                                onTap: { onboardingManager.goToStep(.profile) }
                            )

                            SetupSummaryRow(
                                title: "Services",
                                subtitle: "\(onboardingManager.selectedProfessions.count) selected",
                                isComplete: onboardingManager.professionsComplete,
                                onTap: { onboardingManager.goToStep(.professions) }
                            )

                            SetupSummaryRow(
                                title: "Schedule",
                                subtitle: availabilityDescription,
                                isComplete: onboardingManager.availabilityComplete,
                                onTap: { onboardingManager.goToStep(.availability) }
                            )

                            SetupSummaryRow(
                                title: "Documents",
                                subtitle: documentsDescription,
                                isComplete: onboardingManager.documentsComplete,
                                onTap: { onboardingManager.goToStep(.documents) }
                            )

                            SetupSummaryRow(
                                title: "Payments",
                                subtitle: onboardingManager.stripeComplete ? "Connected" : "Not connected",
                                isComplete: onboardingManager.stripeComplete,
                                onTap: { onboardingManager.goToStep(.stripeConnect) }
                            )
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .padding(.horizontal)

                        // Warnings
                        if !allRequiredComplete {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .foregroundColor(.orange)
                                    Text("Complete required steps")
                                        .font(.subheadline.weight(.medium))
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    if !onboardingManager.profileComplete {
                                        Text("• Complete your profile")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    if !onboardingManager.professionsComplete {
                                        Text("• Select at least one service")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    if !onboardingManager.availabilityComplete {
                                        Text("• Set your availability")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            .padding()
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(12)
                            .padding(.horizontal)
                        }

                        // Optional items notice
                        if allRequiredComplete && (!onboardingManager.documentsComplete || !onboardingManager.stripeComplete) {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Image(systemName: "info.circle.fill")
                                        .foregroundColor(.blue)
                                    Text("Optional but Recommended")
                                        .font(.subheadline.weight(.medium))
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    if !onboardingManager.documentsComplete {
                                        Text("• Upload verification documents to build trust")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    if !onboardingManager.stripeComplete {
                                        Text("• Connect Stripe to receive payments")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            .padding()
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(12)
                            .padding(.horizontal)
                        }

                        // Error message
                        if let error = onboardingManager.error {
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.red)
                                .padding(.horizontal)
                        }
                    }
                }
                .padding(.top)
            }

            // Action button
            if !onboardingSuccess {
                Button {
                    goLive()
                } label: {
                    HStack {
                        if isGoingLive {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "bolt.fill")
                            Text("Go Live")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(allRequiredComplete ? Color.green : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(!allRequiredComplete || isGoingLive)
                .padding()
            }
        }
    }

    private var allRequiredComplete: Bool {
        onboardingManager.profileComplete &&
        onboardingManager.professionsComplete &&
        onboardingManager.availabilityComplete
    }

    private var availabilityDescription: String {
        let enabledDays = onboardingManager.availability.filter { $0.isEnabled }
        if enabledDays.isEmpty {
            return "Not set"
        } else if enabledDays.count == 7 {
            return "Every day"
        } else {
            return "\(enabledDays.count) days/week"
        }
    }

    private var documentsDescription: String {
        let count = onboardingManager.documents.count
        if count == 0 {
            return "None uploaded"
        }
        let pending = onboardingManager.documents.filter { $0.status == .pending }.count
        let verified = onboardingManager.documents.filter { $0.status == .verified }.count
        if verified > 0 {
            return "\(verified) verified"
        } else if pending > 0 {
            return "\(pending) pending review"
        }
        return "\(count) uploaded"
    }

    private func goLive() {
        isGoingLive = true

        Task {
            let success = await onboardingManager.completeOnboarding()

            if success {
                onboardingSuccess = true
                // Refresh user data
                await authManager.loadCurrentUser()

                // After a delay, the app should navigate to the main interface
                try? await Task.sleep(nanoseconds: 2_000_000_000)

                // The ContentView should detect onboardingComplete and show main app
            }

            isGoingLive = false
        }
    }
}

struct SetupSummaryRow: View {
    let title: String
    let subtitle: String
    let isComplete: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                Image(systemName: isComplete ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isComplete ? .green : .gray)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct SuccessView: View {
    @State private var showCheckmark = false

    var body: some View {
        VStack(spacing: 24) {
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.1))
                    .frame(width: 120, height: 120)

                Circle()
                    .fill(Color.green.opacity(0.2))
                    .frame(width: 100, height: 100)
                    .scaleEffect(showCheckmark ? 1 : 0.5)
                    .animation(.spring(response: 0.6, dampingFraction: 0.6), value: showCheckmark)

                Image(systemName: "checkmark")
                    .font(.system(size: 50, weight: .bold))
                    .foregroundColor(.green)
                    .scaleEffect(showCheckmark ? 1 : 0)
                    .animation(.spring(response: 0.5, dampingFraction: 0.5).delay(0.2), value: showCheckmark)
            }

            VStack(spacing: 12) {
                Text("You're Live!")
                    .font(.title.bold())

                Text("Congratulations! Your profile is now visible to customers. You'll receive notifications when someone wants to book your services.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }

            // Tips
            VStack(alignment: .leading, spacing: 12) {
                Text("Tips for Success")
                    .font(.headline)

                TipRow(icon: "star.fill", text: "Respond to inquiries quickly")
                TipRow(icon: "camera.fill", text: "Add photos of your work")
                TipRow(icon: "hand.thumbsup.fill", text: "Ask happy customers for reviews")
                TipRow(icon: "clock.fill", text: "Keep your availability up to date")
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
        .padding()
        .onAppear {
            showCheckmark = true
        }
    }
}

struct TipRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.blue)
                .frame(width: 24)
            Text(text)
                .font(.subheadline)
            Spacer()
        }
    }
}

#Preview {
    WorkerGoLiveView()
        .environmentObject(WorkerOnboardingManager.shared)
        .environmentObject(AuthManager.shared)
}
