import SwiftUI

struct WorkerStripeConnectView: View {
    @EnvironmentObject var onboardingManager: WorkerOnboardingManager
    @State private var showingWebView = false
    @State private var stripeUrl: URL?

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: "creditcard.and.123")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)

                        Text("Set Up Payments")
                            .font(.title2.bold())

                        Text("Connect your bank account to receive payments from bookings. We use Stripe for secure, fast payouts.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()

                    // Benefits
                    VStack(spacing: 16) {
                        BenefitRow(
                            icon: "bolt.fill",
                            title: "Fast Payouts",
                            description: "Get paid within 2-3 business days"
                        )

                        BenefitRow(
                            icon: "lock.fill",
                            title: "Secure",
                            description: "Bank-level encryption protects your data"
                        )

                        BenefitRow(
                            icon: "globe",
                            title: "Global Support",
                            description: "Works with banks in 40+ countries"
                        )

                        BenefitRow(
                            icon: "chart.bar.fill",
                            title: "Track Earnings",
                            description: "See your earnings and payout history"
                        )
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding(.horizontal)

                    // Current status
                    if let status = onboardingManager.stripeStatus {
                        StripeStatusCard(status: status)
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
                .padding(.top)
            }

            // Action buttons
            VStack(spacing: 12) {
                if onboardingManager.stripeStatus?.onboardingComplete == true {
                    // Already connected
                    Button {
                        onboardingManager.nextStep()
                    } label: {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                            Text("Continue")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                } else {
                    // Connect with Stripe
                    Button {
                        connectStripe()
                    } label: {
                        HStack {
                            if onboardingManager.isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Image(systemName: "link")
                                Text("Connect with Stripe")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(onboardingManager.isLoading)

                    // Skip option
                    Button {
                        onboardingManager.nextStep()
                    } label: {
                        Text("Skip for Now")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }

                    Text("You can set up payments later in Settings")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
        .sheet(isPresented: $showingWebView) {
            if let url = stripeUrl {
                SafariView(url: url)
                    .onDisappear {
                        Task {
                            await onboardingManager.refreshStripeStatus()
                        }
                    }
            }
        }
        .onAppear {
            Task {
                await onboardingManager.refreshStripeStatus()
            }
        }
    }

    private func connectStripe() {
        Task {
            if let urlString = await onboardingManager.createStripeAccount(),
               let url = URL(string: urlString) {
                stripeUrl = url
                showingWebView = true
            }
        }
    }
}

struct BenefitRow: View {
    let icon: String
    let title: String
    let description: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.blue)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.medium))
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
    }
}

struct StripeStatusCard: View {
    let status: StripeConnectStatus

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: statusIcon)
                .font(.title2)
                .foregroundColor(statusColor)

            VStack(alignment: .leading, spacing: 2) {
                Text("Stripe Status")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(statusText)
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(statusColor)
            }

            Spacer()

            if status.onboardingComplete, let _ = status.dashboardUrl {
                Button("Dashboard") {
                    // Open dashboard
                }
                .font(.caption)
                .foregroundColor(.blue)
            }
        }
        .padding()
        .background(statusColor.opacity(0.1))
        .cornerRadius(12)
    }

    private var statusIcon: String {
        switch status.status {
        case "complete": return "checkmark.seal.fill"
        case "restricted": return "exclamationmark.triangle.fill"
        case "pending": return "clock.fill"
        default: return "questionmark.circle"
        }
    }

    private var statusColor: Color {
        switch status.status {
        case "complete": return .green
        case "restricted": return .orange
        case "pending": return .yellow
        default: return .gray
        }
    }

    private var statusText: String {
        switch status.status {
        case "complete": return "Connected and Ready"
        case "restricted": return "Additional Info Required"
        case "pending": return "Verification Pending"
        case "none": return "Not Connected"
        default: return "Unknown Status"
        }
    }
}

// Safari View Controller wrapper
import SafariServices

struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let config = SFSafariViewController.Configuration()
        config.entersReaderIfAvailable = false
        let vc = SFSafariViewController(url: url, configuration: config)
        return vc
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

#Preview {
    WorkerStripeConnectView()
        .environmentObject(WorkerOnboardingManager.shared)
}
