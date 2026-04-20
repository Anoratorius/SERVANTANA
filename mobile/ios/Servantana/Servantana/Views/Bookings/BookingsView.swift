import SwiftUI

@MainActor
class BookingsViewModel: ObservableObject {
    @Published var upcomingBookings: [Booking] = []
    @Published var pastBookings: [Booking] = []
    @Published var isLoading = true
    @Published var error: String?
    @Published var selectedTab = 0

    func loadBookings() async {
        isLoading = true
        error = nil

        do {
            let response = try await APIService.shared.getBookings()
            let allBookings = response.bookings

            upcomingBookings = allBookings.filter {
                ["PENDING", "CONFIRMED", "IN_PROGRESS"].contains($0.status)
            }.sorted { $0.scheduledDate < $1.scheduledDate }

            pastBookings = allBookings.filter {
                ["COMPLETED", "CANCELLED"].contains($0.status)
            }.sorted { $0.scheduledDate > $1.scheduledDate }
        } catch APIError.serverError(let message) {
            error = message
        } catch {
            error = "Failed to load bookings"
        }

        isLoading = false
    }
}

struct BookingsView: View {
    @StateObject private var viewModel = BookingsViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("", selection: $viewModel.selectedTab) {
                    Text("Upcoming").tag(0)
                    Text("Past").tag(1)
                }
                .pickerStyle(.segmented)
                .padding()

                // Content
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if let error = viewModel.error {
                    Spacer()
                    VStack(spacing: 16) {
                        Text(error)
                            .foregroundColor(.red)
                        Button("Retry") {
                            Task {
                                await viewModel.loadBookings()
                            }
                        }
                    }
                    Spacer()
                } else {
                    let bookings = viewModel.selectedTab == 0 ? viewModel.upcomingBookings : viewModel.pastBookings

                    if bookings.isEmpty {
                        Spacer()
                        VStack(spacing: 16) {
                            Image(systemName: "calendar")
                                .font(.system(size: 48))
                                .foregroundColor(.secondary)
                            Text(viewModel.selectedTab == 0 ? "No upcoming bookings" : "No past bookings")
                                .font(.headline)
                            if viewModel.selectedTab == 0 {
                                NavigationLink("Find a Professional") {
                                    SearchView()
                                }
                                .buttonStyle(.bordered)
                            }
                        }
                        Spacer()
                    } else {
                        List(bookings) { booking in
                            NavigationLink(destination: BookingDetailView(bookingId: booking.id)) {
                                BookingListRow(booking: booking)
                            }
                        }
                        .listStyle(.plain)
                        .refreshable {
                            await viewModel.loadBookings()
                        }
                    }
                }
            }
            .navigationTitle("Bookings")
            .task {
                await viewModel.loadBookings()
            }
        }
    }
}

struct BookingListRow: View {
    let booking: Booking

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(booking.service?.name ?? "Service")
                    .fontWeight(.semibold)
                Spacer()
                StatusBadge(status: booking.status)
            }

            if let cleaner = booking.cleaner {
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color.accentColor.opacity(0.1))
                        .frame(width: 32, height: 32)
                        .overlay(
                            Text(cleaner.initials)
                                .font(.caption)
                                .foregroundColor(.accentColor)
                        )
                    Text(cleaner.fullName)
                        .font(.subheadline)
                }
            }

            HStack(spacing: 16) {
                Label(booking.scheduledDate, systemImage: "calendar")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Label(booking.scheduledTime, systemImage: "clock")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Label(booking.address, systemImage: "location")
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(1)

            HStack {
                Text("€\(String(format: "%.2f", booking.totalPrice))")
                    .fontWeight(.bold)
                    .foregroundColor(.accentColor)

                Spacer()

                if booking.isInProgress {
                    NavigationLink(destination: TrackingView(bookingId: booking.id)) {
                        Label("Track", systemImage: "location.fill")
                            .font(.caption)
                    }
                    .buttonStyle(.bordered)
                    .tint(.accentColor)
                }
            }
        }
        .padding(.vertical, 8)
    }
}

struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(status.replacingOccurrences(of: "_", with: " "))
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.1))
            .foregroundColor(statusColor)
            .cornerRadius(4)
    }

    private var statusColor: Color {
        switch status {
        case "PENDING": return .orange
        case "CONFIRMED": return .blue
        case "IN_PROGRESS": return .green
        case "COMPLETED": return .blue
        case "CANCELLED": return .red
        default: return .gray
        }
    }
}

#Preview {
    BookingsView()
}
