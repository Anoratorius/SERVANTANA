import Foundation
import StripePaymentSheet

@MainActor
class PaymentManager: ObservableObject {
    static let shared = PaymentManager()

    @Published var paymentSheet: PaymentSheet?
    @Published var isLoading = false
    @Published var paymentResult: PaymentSheetResult?
    @Published var errorMessage: String?

    private init() {}

    struct PaymentIntentResponse: Codable {
        let paymentIntent: String
        let ephemeralKey: String
        let customer: String
        let publishableKey: String
    }

    /// Prepare payment for a booking
    func preparePayment(for bookingId: String) async -> Bool {
        isLoading = true
        errorMessage = nil

        do {
            let response: PaymentIntentResponse = try await APIClient.shared.request(
                "/payments/mobile/create-intent",
                method: "POST",
                body: ["bookingId": bookingId]
            )

            // Configure Stripe
            STPAPIClient.shared.publishableKey = response.publishableKey

            // Create PaymentSheet configuration
            var configuration = PaymentSheet.Configuration()
            configuration.merchantDisplayName = "Servantana"
            configuration.customer = .init(id: response.customer, ephemeralKeySecret: response.ephemeralKey)
            configuration.allowsDelayedPaymentMethods = false
            configuration.applePay = .init(merchantId: "merchant.com.servantana.app", merchantCountryCode: "DE")
            configuration.primaryButtonColor = UIColor(red: 0.247, green: 0.318, blue: 0.478, alpha: 1.0)

            // Create PaymentSheet
            paymentSheet = PaymentSheet(paymentIntentClientSecret: response.paymentIntent, configuration: configuration)

            isLoading = false
            return true
        } catch {
            errorMessage = "Failed to prepare payment: \(error.localizedDescription)"
            isLoading = false
            return false
        }
    }

    /// Present payment sheet and handle result
    func presentPaymentSheet(from viewController: UIViewController) async -> Bool {
        guard let paymentSheet else {
            errorMessage = "Payment not prepared"
            return false
        }

        return await withCheckedContinuation { continuation in
            paymentSheet.present(from: viewController) { [weak self] result in
                Task { @MainActor in
                    self?.paymentResult = result

                    switch result {
                    case .completed:
                        continuation.resume(returning: true)
                    case .canceled:
                        self?.errorMessage = nil
                        continuation.resume(returning: false)
                    case .failed(let error):
                        self?.errorMessage = error.localizedDescription
                        continuation.resume(returning: false)
                    }
                }
            }
        }
    }

    /// Reset payment state
    func reset() {
        paymentSheet = nil
        paymentResult = nil
        errorMessage = nil
        isLoading = false
    }
}
