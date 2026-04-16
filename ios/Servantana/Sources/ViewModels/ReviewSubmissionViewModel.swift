import Foundation

@MainActor
class ReviewSubmissionViewModel: ObservableObject {
    @Published var rating: Int = 5
    @Published var comment: String = ""
    @Published var isSubmitting = false
    @Published var isSuccess = false
    @Published var error: String?
    @Published var booking: Booking?
    @Published var isLoadingBooking = false

    private let bookingId: String

    init(bookingId: String) {
        self.bookingId = bookingId
        Task {
            await loadBooking()
        }
    }

    var workerName: String {
        guard let worker = booking?.cleaner else { return "" }
        return "\(worker.firstName) \(worker.lastName)"
    }

    var serviceName: String {
        booking?.service?.name ?? "Service"
    }

    var isFormValid: Bool {
        rating >= 1 && rating <= 5
    }

    func loadBooking() async {
        isLoadingBooking = true
        error = nil

        do {
            let response = try await APIClient.shared.getBooking(id: bookingId)
            booking = response.booking
        } catch {
            self.error = error.localizedDescription
        }

        isLoadingBooking = false
    }

    func submitReview() async {
        guard isFormValid else {
            error = "Please select a rating"
            return
        }

        isSubmitting = true
        error = nil

        do {
            let request = CreateReviewRequest(
                bookingId: bookingId,
                rating: rating,
                comment: comment.isEmpty ? nil : comment
            )
            _ = try await APIClient.shared.createReview(request)
            isSuccess = true
        } catch {
            self.error = error.localizedDescription
        }

        isSubmitting = false
    }
}
