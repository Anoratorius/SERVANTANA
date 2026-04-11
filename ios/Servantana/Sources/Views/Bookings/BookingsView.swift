import SwiftUI

struct BookingsView: View {
    @StateObject private var viewModel = BookingsViewModel()
    @State private var selectedFilter: BookingStatus?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Filter tabs
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "All", isSelected: selectedFilter == nil) {
                            selectedFilter = nil
                        }
                        ForEach(BookingStatus.allCases, id: \.self) { status in
                            FilterChip(title: status.displayName, isSelected: selectedFilter == status) {
                                selectedFilter = status
                            }
                        }
                    }
                    .padding()
                }

                // Bookings list
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if filteredBookings.isEmpty {
                    Spacer()
                    VStack(spacing: 16) {
                        Image(systemName: "calendar")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("No bookings")
                            .font(.headline)
                        Text("Your bookings will appear here")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                } else {
                    List(filteredBookings) { booking in
                        NavigationLink {
                            BookingDetailView(bookingId: booking.id)
                        } label: {
                            BookingListRow(booking: booking)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Bookings")
            .refreshable {
                await viewModel.loadBookings()
            }
        }
    }

    private var filteredBookings: [Booking] {
        guard let filter = selectedFilter else {
            return viewModel.bookings
        }
        return viewModel.bookings.filter { $0.status == filter }
    }
}

struct BookingListRow: View {
    let booking: Booking

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(booking.service?.name ?? "Service")
                        .font(.headline)

                    if let workerName = booking.cleaner?.fullName {
                        Text("with \(workerName)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                StatusBadge(status: booking.status)
            }

            HStack {
                Label(booking.formattedDate, systemImage: "calendar")
                Spacer()
                Label(booking.formattedTime, systemImage: "clock")
                Spacer()
                Text("\(Int(booking.totalPrice)) \(booking.currency)")
                    .fontWeight(.semibold)
                    .foregroundStyle(.blue)
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 8)
    }
}

#Preview {
    BookingsView()
}
