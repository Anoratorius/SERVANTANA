import SwiftUI
import MapKit

struct RouteOptimizerView: View {
    @StateObject private var viewModel = RouteOptimizerViewModel()
    @State private var showDatePicker = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Date selector
                Button {
                    showDatePicker = true
                } label: {
                    HStack {
                        Image(systemName: "calendar")
                            .foregroundStyle(.tint)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Selected Date")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(viewModel.selectedDate, style: .date)
                                .font(.headline)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
                }
                .buttonStyle(.plain)
                .padding(.horizontal)

                // Optimize button
                Button {
                    Task { await viewModel.optimizeRoute() }
                } label: {
                    HStack {
                        if viewModel.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .tint(.white)
                            Text("Optimizing...")
                        } else {
                            Image(systemName: "sparkles")
                            Text("Optimize Route with AI")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(viewModel.isLoading)
                .padding(.horizontal)

                // Error
                if let error = viewModel.error {
                    Text(error)
                        .foregroundStyle(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .padding(.horizontal)
                }

                // Results
                if let route = viewModel.route {
                    RouteResultView(route: route)
                }

                // No bookings
                if viewModel.route == nil && !viewModel.isLoading && viewModel.error == nil && viewModel.hasSearched {
                    NoBookingsView()
                }
            }
            .padding(.vertical)
        }
        .navigationTitle("Route Optimizer")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showDatePicker) {
            DatePickerSheet(selectedDate: $viewModel.selectedDate, isPresented: $showDatePicker)
        }
    }
}

struct DatePickerSheet: View {
    @Binding var selectedDate: Date
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            DatePicker("Select Date", selection: $selectedDate, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .padding()
                .navigationTitle("Select Date")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") { isPresented = false }
                    }
                }
        }
        .presentationDetents([.medium])
    }
}

struct RouteResultView: View {
    let route: OptimizedRouteResult

    var body: some View {
        VStack(spacing: 16) {
            // Savings summary
            VStack(spacing: 12) {
                Text("Route Optimized!")
                    .font(.headline)

                HStack(spacing: 24) {
                    RouteStat(icon: "arrow.triangle.swap", value: "\(String(format: "%.1f", route.totalDistance)) km", label: "Total Distance")
                    RouteStat(icon: "clock", value: "\(route.totalDuration) min", label: "Total Time")
                }

                if route.savedMinutes > 0 {
                    HStack {
                        Image(systemName: "leaf")
                            .foregroundStyle(.green)
                        Text("Saving \(String(format: "%.1f", route.savedDistance)) km and \(route.savedMinutes) minutes!")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.green)
                    }
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            .padding()
            .background(Color.accentColor.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal)

            // Schedule header
            HStack {
                Text("Optimized Schedule")
                    .font(.headline)
                Spacer()
                Text("\(route.schedule.count) stops")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)

            // Schedule items
            VStack(spacing: 0) {
                ForEach(Array(route.schedule.enumerated()), id: \.element.bookingId) { index, entry in
                    ScheduleStopRow(
                        entry: entry,
                        leg: index < route.legs.count ? route.legs[index] : nil,
                        stopNumber: index + 1,
                        isLast: index == route.schedule.count - 1
                    )
                }
            }
            .padding(.horizontal)

            // Open in Maps
            Button {
                openInMaps(route: route)
            } label: {
                HStack {
                    Image(systemName: "map")
                    Text("Open in Apple Maps")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal)
        }
    }

    private func openInMaps(route: OptimizedRouteResult) {
        guard let first = route.optimizedOrder.first else { return }

        var mapItems: [MKMapItem] = []
        for location in route.optimizedOrder {
            let placemark = MKPlacemark(coordinate: CLLocationCoordinate2D(
                latitude: location.latitude,
                longitude: location.longitude
            ))
            let item = MKMapItem(placemark: placemark)
            item.name = location.name
            mapItems.append(item)
        }

        MKMapItem.openMaps(with: mapItems, launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
        ])
    }
}

struct RouteStat: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title2)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

struct ScheduleStopRow: View {
    let entry: ScheduleEntryResult
    let leg: RouteLegResult?
    let stopNumber: Int
    let isLast: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Timeline
            VStack(spacing: 0) {
                ZStack {
                    Circle()
                        .fill(Color.accentColor)
                        .frame(width: 32, height: 32)
                    Text("\(stopNumber)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                }

                if !isLast {
                    VStack(spacing: 4) {
                        Rectangle()
                            .fill(Color.accentColor.opacity(0.3))
                            .frame(width: 2, height: 20)

                        if let leg = leg {
                            Text("\(String(format: "%.1f", leg.distanceKm))km")
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary)
                            Text("\(leg.estimatedMinutes)min")
                                .font(.system(size: 10))
                                .foregroundStyle(.secondary)
                        }

                        Rectangle()
                            .fill(Color.accentColor.opacity(0.3))
                            .frame(width: 2, height: 20)
                    }
                }
            }

            // Stop details
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(entry.arrivalTime)
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(.tint)
                    Text("→ \(entry.departureTime)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if !entry.address.isEmpty {
                    HStack(alignment: .top, spacing: 4) {
                        Image(systemName: "location")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(entry.address)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        }
        .padding(.bottom, isLast ? 0 : 8)
    }
}

struct NoBookingsView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No Bookings Found")
                .font(.headline)

            Text("No confirmed bookings found for this date. Try selecting a different date.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

// MARK: - ViewModel

@MainActor
class RouteOptimizerViewModel: ObservableObject {
    @Published var selectedDate: Date = Date() {
        didSet {
            route = nil
            error = nil
            hasSearched = false
        }
    }
    @Published var isLoading = false
    @Published var route: OptimizedRouteResult?
    @Published var error: String?
    @Published var hasSearched = false

    func optimizeRoute() async {
        isLoading = true
        error = nil

        do {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let dateStr = dateFormatter.string(from: selectedDate)

            let request = RouteOptimizeRequestBody(date: dateStr, bookingIds: nil, startLocation: nil)

            let response: RouteOptimizeAPIResponse = try await APIClient.shared.request(
                "ai/route-optimize",
                method: "POST",
                body: request
            )

            route = OptimizedRouteResult(from: response)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
        hasSearched = true
    }
}

// MARK: - Models

struct RouteOptimizeRequestBody: Codable {
    let date: String
    let bookingIds: [String]?
    let startLocation: LocationBody?

    struct LocationBody: Codable {
        let latitude: Double
        let longitude: Double
    }
}

struct RouteOptimizeAPIResponse: Codable {
    let route: RouteData
    let metadata: MetadataData

    struct RouteData: Codable {
        let originalOrder: [LocationData]
        let optimizedOrder: [LocationData]
        let savings: SavingsData
        let totalDistance: Double
        let totalDuration: Int
        let legs: [LegData]
        let schedule: [ScheduleData]
    }

    struct LocationData: Codable {
        let id: String
        let name: String
        let latitude: Double
        let longitude: Double
        let scheduledTime: String
        let duration: Int
        let address: String?
    }

    struct SavingsData: Codable {
        let distanceKm: Double
        let estimatedMinutes: Int
        let percentImprovement: Int
    }

    struct LegData: Codable {
        let from: String
        let to: String
        let distanceKm: Double
        let estimatedMinutes: Int
    }

    struct ScheduleData: Codable {
        let bookingId: String
        let arrivalTime: String
        let departureTime: String
        let address: String
    }

    struct MetadataData: Codable {
        let bookingsOptimized: Int
        let date: String
    }
}

struct OptimizedRouteResult {
    let optimizedOrder: [RouteLocationResult]
    let totalDistance: Double
    let totalDuration: Int
    let savedDistance: Double
    let savedMinutes: Int
    let legs: [RouteLegResult]
    let schedule: [ScheduleEntryResult]

    init(from response: RouteOptimizeAPIResponse) {
        let r = response.route
        self.optimizedOrder = r.optimizedOrder.map { RouteLocationResult(from: $0) }
        self.totalDistance = r.totalDistance
        self.totalDuration = r.totalDuration
        self.savedDistance = r.savings.distanceKm
        self.savedMinutes = r.savings.estimatedMinutes
        self.legs = r.legs.map { RouteLegResult(from: $0) }
        self.schedule = r.schedule.map { ScheduleEntryResult(from: $0) }
    }
}

struct RouteLocationResult {
    let id: String
    let name: String
    let latitude: Double
    let longitude: Double
    let duration: Int
    let address: String

    init(from data: RouteOptimizeAPIResponse.LocationData) {
        self.id = data.id
        self.name = data.name
        self.latitude = data.latitude
        self.longitude = data.longitude
        self.duration = data.duration
        self.address = data.address ?? ""
    }
}

struct RouteLegResult {
    let from: String
    let to: String
    let distanceKm: Double
    let estimatedMinutes: Int

    init(from data: RouteOptimizeAPIResponse.LegData) {
        self.from = data.from
        self.to = data.to
        self.distanceKm = data.distanceKm
        self.estimatedMinutes = data.estimatedMinutes
    }
}

struct ScheduleEntryResult {
    let bookingId: String
    let arrivalTime: String
    let departureTime: String
    let address: String

    init(from data: RouteOptimizeAPIResponse.ScheduleData) {
        self.bookingId = data.bookingId
        self.arrivalTime = data.arrivalTime
        self.departureTime = data.departureTime
        self.address = data.address
    }
}
