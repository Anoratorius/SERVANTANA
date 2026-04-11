import Foundation

@MainActor
class BookingDetailViewModel: ObservableObject {
    @Published var booking: Booking?
    @Published var isLoading = false
    @Published var error: String?

    private let bookingId: String

    init(bookingId: String) {
        self.bookingId = bookingId
        Task {
            await loadBooking()
        }
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

    func cancelBooking() async {
        do {
            let response = try await APIClient.shared.cancelBooking(id: bookingId, reason: nil)
            booking = response.booking
        } catch {
            self.error = error.localizedDescription
        }
    }
}
