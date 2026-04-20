import SwiftUI

@MainActor
class TrackingViewModel: ObservableObject {
    @Published var trackingData: TrackingData?
    @Published var isLoading = true
    @Published var error: String?
    @Published var isConnected = false

    let bookingId: String
    private var pollTask: Task<Void, Never>?

    init(bookingId: String) {
        self.bookingId = bookingId
    }

    func loadTracking() async {
        do {
            trackingData = try await APIService.shared.getTracking(bookingId: bookingId)
            isConnected = true
            error = nil
        } catch APIError.serverError(let message) {
            error = message
            isConnected = false
        } catch {
            self.error = "Failed to load tracking"
            isConnected = false
        }

        isLoading = false
    }

    func startPolling() {
        pollTask = Task {
            while !Task.isCancelled {
                await loadTracking()
                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
            }
        }
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }
}

struct TrackingView: View {
    let bookingId: String
    @StateObject private var viewModel: TrackingViewModel

    init(bookingId: String) {
        self.bookingId = bookingId
        self._viewModel = StateObject(wrappedValue: TrackingViewModel(bookingId: bookingId))
    }

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading {
                Spacer()
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Loading tracking data...")
                        .foregroundColor(.secondary)
                }
                Spacer()
            } else if let error = viewModel.error, viewModel.trackingData == nil {
                Spacer()
                VStack(spacing: 16) {
                    Image(systemName: "location.slash")
                        .font(.system(size: 48))
                        .foregroundColor(.red)
                    Text(error)
                        .foregroundColor(.red)
                    Button("Retry") {
                        Task {
                            await viewModel.loadTracking()
                        }
                    }
                }
                Spacer()
            } else if let tracking = viewModel.trackingData {
                // Map Placeholder
                ZStack {
                    Color(.systemGray6)
                        .ignoresSafeArea()

                    if tracking.trackingActive, let location = tracking.workerLocation {
                        VStack(spacing: 8) {
                            Image(systemName: "map")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            Text("Map View")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            Text("Lat: \(String(format: "%.4f", location.latitude))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("Lng: \(String(format: "%.4f", location.longitude))")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        VStack(spacing: 8) {
                            Image(systemName: "location.magnifyingglass")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            Text("Waiting for location...")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            Text("The professional hasn't started sharing their location yet")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal)
                        }
                    }
                }

                // Info Card
                VStack(spacing: 16) {
                    // Worker Info
                    HStack {
                        Circle()
                            .fill(Color.accentColor.opacity(0.1))
                            .frame(width: 48, height: 48)
                            .overlay(
                                Image(systemName: "person.fill")
                                    .foregroundColor(.accentColor)
                            )

                        VStack(alignment: .leading) {
                            Text(tracking.cleanerName ?? "Professional")
                                .fontWeight(.semibold)
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(tracking.trackingActive ? Color.green : Color.gray)
                                    .frame(width: 8, height: 8)
                                Text(tracking.trackingActive ? "Sharing location" : "Not sharing")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()

                        Button(action: { /* Call */ }) {
                            Image(systemName: "phone.fill")
                                .foregroundColor(.accentColor)
                        }
                    }

                    if tracking.trackingActive {
                        Divider()

                        // ETA & Distance
                        HStack(spacing: 32) {
                            VStack {
                                Text(tracking.estimatedArrival ?? "--")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.accentColor)
                                Text("ETA")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            VStack {
                                Text(tracking.distanceKm.map { String(format: "%.1f km", $0) } ?? "--")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.accentColor)
                                Text("Distance")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            VStack {
                                Text(tracking.status?.replacingOccurrences(of: "_", with: " ") ?? "Active")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.accentColor)
                                Text("Status")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }

                    // Destination
                    if let destination = tracking.destination {
                        Divider()

                        HStack(alignment: .top) {
                            Image(systemName: "location.fill")
                                .foregroundColor(.red)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Destination")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Text(destination.address ?? "Your location")
                            }
                            Spacer()
                        }
                    }
                }
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(16, corners: [.topLeft, .topRight])
                .shadow(color: .black.opacity(0.1), radius: 10, y: -5)
            }
        }
        .navigationTitle("Track Worker")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Circle()
                    .fill(viewModel.isConnected ? Color.green : Color.red)
                    .frame(width: 8, height: 8)
            }
        }
        .onAppear {
            viewModel.startPolling()
        }
        .onDisappear {
            viewModel.stopPolling()
        }
    }
}

#Preview {
    NavigationStack {
        TrackingView(bookingId: "123")
    }
}
