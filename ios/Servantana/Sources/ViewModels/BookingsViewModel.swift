import Foundation

@MainActor
class BookingsViewModel: ObservableObject {
    @Published var bookings: [Booking] = []
    @Published var isLoading = false
    @Published var error: String?

    init() {
        Task {
            await loadBookings()
        }
    }

    func loadBookings() async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.getBookings()
            bookings = response.bookings.sorted { $0.scheduledDate > $1.scheduledDate }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
