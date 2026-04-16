import Foundation
import CoreLocation
import SwiftUI

@MainActor
class LocationManager: NSObject, ObservableObject {
    static let shared = LocationManager()

    private let locationManager = CLLocationManager()

    @Published var currentLocation: CLLocation?
    @Published var currentCity: String?
    @Published var currentCountry: String?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var isUpdatingLocation = false
    @Published var locationError: String?

    // Last known coordinates
    @Published var latitude: Double?
    @Published var longitude: Double?

    private var locationContinuation: CheckedContinuation<CLLocation, Error>?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = 50 // Update every 50 meters
        authorizationStatus = locationManager.authorizationStatus
    }

    // MARK: - Permission

    var hasLocationPermission: Bool {
        switch authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            return true
        default:
            return false
        }
    }

    var canRequestPermission: Bool {
        authorizationStatus == .notDetermined
    }

    func requestPermission() {
        guard canRequestPermission else { return }
        locationManager.requestWhenInUseAuthorization()
    }

    func requestAlwaysPermission() {
        locationManager.requestAlwaysAuthorization()
    }

    // MARK: - Location Updates

    func startUpdatingLocation() {
        guard hasLocationPermission else {
            requestPermission()
            return
        }
        isUpdatingLocation = true
        locationManager.startUpdatingLocation()
    }

    func stopUpdatingLocation() {
        locationManager.stopUpdatingLocation()
        isUpdatingLocation = false
    }

    /// Get current location as a one-shot request
    func getCurrentLocation() async throws -> CLLocation {
        guard hasLocationPermission else {
            requestPermission()
            throw LocationError.permissionDenied
        }

        return try await withCheckedThrowingContinuation { continuation in
            self.locationContinuation = continuation
            locationManager.requestLocation()
        }
    }

    /// Get current location and reverse geocode to city/country
    func getCurrentLocationWithGeocoding() async throws -> LocationData {
        let location = try await getCurrentLocation()

        // Reverse geocode
        let geocoder = CLGeocoder()
        let placemarks = try await geocoder.reverseGeocodeLocation(location)

        let city = placemarks.first?.locality ?? placemarks.first?.subAdministrativeArea
        let country = placemarks.first?.country

        self.currentCity = city
        self.currentCountry = country

        return LocationData(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            city: city,
            country: country,
            accuracy: location.horizontalAccuracy,
            timestamp: location.timestamp
        )
    }

    // MARK: - Server Sync

    /// Update location on server (for customers)
    func syncLocationToServer() async throws -> LocationResponse {
        let locationData = try await getCurrentLocationWithGeocoding()

        let response = try await APIClient.shared.updateUserLocation(
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            city: locationData.city,
            country: locationData.country
        )

        self.latitude = locationData.latitude
        self.longitude = locationData.longitude

        return response
    }

    /// Update worker location on server
    func syncWorkerLocationToServer() async throws -> WorkerLocationResponse {
        let locationData = try await getCurrentLocationWithGeocoding()

        let response = try await APIClient.shared.updateWorkerLocation(
            latitude: locationData.latitude,
            longitude: locationData.longitude
        )

        self.latitude = locationData.latitude
        self.longitude = locationData.longitude

        return response
    }

    // MARK: - Distance Calculation

    /// Calculate distance from current location to a point
    func distanceTo(latitude: Double, longitude: Double) -> Double? {
        guard let currentLocation = currentLocation else { return nil }
        let targetLocation = CLLocation(latitude: latitude, longitude: longitude)
        return currentLocation.distance(from: targetLocation) / 1000 // Return in km
    }

    /// Calculate distance between two points in km
    static func distance(from: (lat: Double, lng: Double), to: (lat: Double, lng: Double)) -> Double {
        let fromLocation = CLLocation(latitude: from.lat, longitude: from.lng)
        let toLocation = CLLocation(latitude: to.lat, longitude: to.lng)
        return fromLocation.distance(from: toLocation) / 1000
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationManager: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        Task { @MainActor in
            self.authorizationStatus = status
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            self.authorizationStatus = manager.authorizationStatus
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }

        Task { @MainActor in
            self.currentLocation = location
            self.latitude = location.coordinate.latitude
            self.longitude = location.coordinate.longitude
            self.locationError = nil

            // Complete any pending one-shot request
            if let continuation = self.locationContinuation {
                self.locationContinuation = nil
                continuation.resume(returning: location)
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.locationError = error.localizedDescription

            // Complete any pending one-shot request with error
            if let continuation = self.locationContinuation {
                self.locationContinuation = nil
                continuation.resume(throwing: error)
            }
        }
    }
}

// MARK: - Supporting Types

struct LocationData {
    let latitude: Double
    let longitude: Double
    let city: String?
    let country: String?
    let accuracy: Double
    let timestamp: Date
}

enum LocationError: LocalizedError {
    case permissionDenied
    case locationUnavailable
    case timeout

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Location permission is required to find nearby workers"
        case .locationUnavailable:
            return "Unable to determine your location"
        case .timeout:
            return "Location request timed out"
        }
    }
}

// MARK: - API Response Models

struct LocationResponse: Codable {
    let success: Bool
    let user: LocationUser?
    let redirectTo: String?

    struct LocationUser: Codable {
        let latitude: Double?
        let longitude: Double?
        let locationCity: String?
        let locationCountry: String?
        let locationVerifiedAt: String?
    }
}

struct WorkerLocationResponse: Codable {
    let message: String
    let location: WorkerLocation

    struct WorkerLocation: Codable {
        let latitude: Double?
        let longitude: Double?
        let city: String?
        let country: String?
        let updatedAt: String?
    }
}

struct UpdateLocationRequest: Codable {
    let latitude: Double
    let longitude: Double
    let city: String?
    let country: String?
}
