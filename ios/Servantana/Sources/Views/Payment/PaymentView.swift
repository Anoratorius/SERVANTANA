import SwiftUI
import StripePaymentSheet

struct PaymentView: View {
    let bookingId: String
    let onPaymentComplete: () -> Void

    @StateObject private var viewModel: PaymentViewModel
    @StateObject private var paymentManager = PaymentManager.shared
    @Environment(\.dismiss) private var dismiss

    init(bookingId: String, onPaymentComplete: @escaping () -> Void) {
        self.bookingId = bookingId
        self.onPaymentComplete = onPaymentComplete
        _viewModel = StateObject(wrappedValue: PaymentViewModel(bookingId: bookingId))
    }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView("Loading...")
                } else if let booking = viewModel.booking {
                    paymentContent(booking: booking)
                } else if let error = viewModel.error {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundStyle(.red)
                        Text(error)
                            .foregroundStyle(.secondary)
                        Button("Retry") {
                            Task { await viewModel.loadBooking() }
                        }
                    }
                }
            }
            .navigationTitle("Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func paymentContent(booking: Booking) -> some View {
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
                        Text(booking.service?.name ?? "Service")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Date")
                        Spacer()
                        Text(booking.formattedDate)
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Time")
                        Spacer()
                        Text(booking.formattedTime)
                            .foregroundStyle(.secondary)
                    }

                    if let worker = booking.cleaner {
                        HStack {
                            Text("Worker")
                            Spacer()
                            Text("\(worker.firstName) \(worker.lastName)")
                                .foregroundStyle(.secondary)
                        }
                    }

                    Divider()

                    HStack {
                        Text("Total")
                            .font(.headline)
                        Spacer()
                        Text(formattedPrice(booking))
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(.green)
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
                            Text("Pay \(formattedPrice(booking))")
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
    }

    private func formattedPrice(_ booking: Booking) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = booking.currency
        return formatter.string(from: NSNumber(value: booking.totalPrice)) ?? "€\(booking.totalPrice)"
    }

    private func initiatePayment() async {
        // Prepare payment
        let prepared = await paymentManager.preparePayment(for: bookingId)
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

// MARK: - Payment ViewModel

@MainActor
class PaymentViewModel: ObservableObject {
    @Published var booking: Booking?
    @Published var isLoading = false
    @Published var error: String?

    private let bookingId: String

    init(bookingId: String) {
        self.bookingId = bookingId
        Task { await loadBooking() }
    }

    func loadBooking() async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.getBooking(id: bookingId)
            booking = response.booking
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    PaymentView(bookingId: "1") {}
}
