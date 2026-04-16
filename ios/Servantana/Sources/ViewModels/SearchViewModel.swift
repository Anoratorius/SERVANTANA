import Foundation
import CoreLocation

@MainActor
class SearchViewModel: ObservableObject {
    @Published var workers: [Worker] = []
    @Published var isLoading = false
    @Published var error: String?

    // Location
    @Published var useLocation = true
    @Published var currentLatitude: Double?
    @Published var currentLongitude: Double?
    @Published var maxDistance: Int = 25 // km
    @Published var isLoadingLocation = false
    @Published var locationError: String?

    // Filters
    @Published var minRating: Float?
    @Published var ecoFriendly = false
    @Published var petFriendly = false
    @Published var verifiedOnly = false

    private let locationManager = LocationManager.shared

    /// Fetch user's location and search for nearby workers
    func searchWithLocation(query: String = "", categoryId: String? = nil) async {
        // Try to get current location first
        if useLocation && currentLatitude == nil {
            await fetchCurrentLocation()
        }

        await search(query: query, categoryId: categoryId)
    }

    /// Fetch current location from device
    func fetchCurrentLocation() async {
        guard locationManager.hasLocationPermission else {
            locationManager.requestPermission()
            locationError = "Location permission required to find nearby workers"
            return
        }

        isLoadingLocation = true
        locationError = nil

        do {
            let location = try await locationManager.getCurrentLocation()
            currentLatitude = location.coordinate.latitude
            currentLongitude = location.coordinate.longitude

            // Sync to server
            _ = try? await locationManager.syncLocationToServer()
        } catch {
            locationError = error.localizedDescription
        }

        isLoadingLocation = false
    }

    func search(query: String = "", categoryId: String? = nil) async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.getWorkers(
                latitude: useLocation ? currentLatitude : nil,
                longitude: useLocation ? currentLongitude : nil,
                maxDistance: useLocation ? maxDistance : nil,
                categoryId: categoryId
            )
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

            // Sort by distance if location available
            if useLocation && currentLatitude != nil && currentLongitude != nil {
                results.sort { worker1, worker2 in
                    let dist1 = worker1.workerProfile?.distance ?? Float.greatestFiniteMagnitude
                    let dist2 = worker2.workerProfile?.distance ?? Float.greatestFiniteMagnitude
                    return dist1 < dist2
                }
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

    func toggleLocationFilter() {
        useLocation.toggle()
        Task {
            if useLocation {
                await searchWithLocation()
            } else {
                await search()
            }
        }
    }

    func updateMaxDistance(_ distance: Int) {
        maxDistance = distance
        Task {
            await search()
        }
    }
}
