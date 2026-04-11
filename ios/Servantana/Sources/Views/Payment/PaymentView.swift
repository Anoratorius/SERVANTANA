import SwiftUI
import StripePaymentSheet

struct PaymentView: View {
    let booking: Booking
    let onPaymentComplete: () -> Void

    @StateObject private var paymentManager = PaymentManager.shared
    @Environment(\.dismiss) private var dismiss
    @State private var showingPaymentSheet = false

    var body: some View {
        VStack(spacing: 24) {
            // Booking Summary
            VStack(spacing: 16) {
                Text("Payment Summary")
                    .font(.title2)
                    .fontWeight(.bold)

                VStack(spacing: 12) {
                    HStack {
                        Text("Service")
                        Spacer()
                        Text(booking.serviceName ?? "Service")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Date")
                        Spacer()
                        Text(booking.scheduledDate, style: .date)
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Time")
                        Spacer()
                        Text(booking.scheduledTime)
                            .foregroundStyle(.secondary)
                    }

                    Divider()

                    HStack {
                        Text("Total")
                            .font(.headline)
                        Spacer()
                        Text(formattedPrice)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(.blue)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            .padding()

            Spacer()

            // Payment Button
            VStack(spacing: 12) {
                if let errorMessage = paymentManager.errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await initiatePayment() }
                } label: {
                    HStack {
                        if paymentManager.isLoading {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "creditcard.fill")
                            Text("Pay \(formattedPrice)")
                        }
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .cornerRadius(12)
                }
                .disabled(paymentManager.isLoading)

                // Apple Pay hint
                HStack(spacing: 4) {
                    Image(systemName: "apple.logo")
                    Text("Apple Pay available")
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .padding()
        }
        .navigationTitle("Payment")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var formattedPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = booking.currency
        return formatter.string(from: NSNumber(value: booking.totalPrice)) ?? "\(booking.currency) \(booking.totalPrice)"
    }

    private func initiatePayment() async {
        // Prepare payment
        let prepared = await paymentManager.preparePayment(for: booking.id)
        guard prepared else { return }

        // Get the root view controller
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootVC = windowScene.windows.first?.rootViewController else {
            paymentManager.errorMessage = "Cannot present payment sheet"
            return
        }

        // Present payment sheet
        let success = await paymentManager.presentPaymentSheet(from: rootVC)

        if success {
            paymentManager.reset()
            onPaymentComplete()
            dismiss()
        }
    }
}

#Preview {
    NavigationStack {
        PaymentView(
            booking: Booking(
                id: "1",
                customerId: "c1",
                cleanerId: "w1",
                status: .pending,
                scheduledDate: Date(),
                scheduledTime: "10:00",
                duration: 2,
                totalPrice: 80,
                currency: "EUR",
                address: "123 Main St",
                createdAt: Date()
            ),
            onPaymentComplete: {}
        )
    }
}
