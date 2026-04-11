import Foundation

@MainActor
class SearchViewModel: ObservableObject {
    @Published var workers: [Worker] = []
    @Published var isLoading = false
    @Published var error: String?

    // Filters
    @Published var minRating: Float?
    @Published var ecoFriendly = false
    @Published var petFriendly = false
    @Published var verifiedOnly = false

    func search(query: String = "", categoryId: String? = nil) async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.getWorkers(categoryId: categoryId)
            var results = response.cleaners

            // Apply client-side filters
            if !query.isEmpty {
                let lowercasedQuery = query.lowercased()
                results = results.filter { worker in
                    worker.firstName.lowercased().contains(lowercasedQuery) ||
                    worker.lastName.lowercased().contains(lowercasedQuery) ||
                    worker.profession?.lowercased().contains(lowercasedQuery) == true
                }
            }

            if let minRating = minRating {
                results = results.filter { $0.rating >= Double(minRating) }
            }

            if ecoFriendly {
                results = results.filter { $0.workerProfile?.ecoFriendly == true }
            }

            if petFriendly {
                results = results.filter { $0.workerProfile?.petFriendly == true }
            }

            if verifiedOnly {
                results = results.filter { $0.isVerified }
            }

            workers = results
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func toggleRatingFilter() {
        if minRating != nil {
            minRating = nil
        } else {
            minRating = 4.0
        }
        Task {
            await search()
        }
    }
}
