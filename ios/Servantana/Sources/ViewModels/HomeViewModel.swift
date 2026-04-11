import Foundation

@MainActor
class HomeViewModel: ObservableObject {
    @Published var categories: [Category] = []
    @Published var featuredWorkers: [Worker] = []
    @Published var recentBookings: [Booking] = []
    @Published var isLoading = false
    @Published var error: String?

    init() {
        Task {
            await loadData()
        }
    }

    func loadData() async {
        isLoading = true
        error = nil

        async let categoriesTask = loadCategories()
        async let workersTask = loadFeaturedWorkers()
        async let bookingsTask = loadRecentBookings()

        await categoriesTask
        await workersTask
        await bookingsTask

        isLoading = false
    }

    func refresh() async {
        await loadData()
    }

    private func loadCategories() async {
        do {
            let response = try await APIClient.shared.getCategories()
            categories = response.categories
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func loadFeaturedWorkers() async {
        do {
            let response = try await APIClient.shared.getWorkers()
            featuredWorkers = Array(response.cleaners.prefix(5))
        } catch {
            // Silently fail for featured workers
        }
    }

    private func loadRecentBookings() async {
        do {
            let response = try await APIClient.shared.getBookings()
            recentBookings = response.bookings
        } catch {
            // Silently fail for recent bookings
        }
    }
}
