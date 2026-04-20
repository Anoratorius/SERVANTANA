import SwiftUI

@MainActor
class WorkerDashboardViewModel: ObservableObject {
    @Published var profile: WorkerProfile?
    @Published var pendingBookings: [Booking] = []
    @Published var todayBookings: [Booking] = []
    @Published var earnings: [String: Any] = [:]
    @Published var isLoading = true
    @Published var error: String?
    @Published var isUpdatingStatus = false

    func loadDashboard() async {
        isLoading = true
        error = nil

        async let profileTask: () = loadProfile()
        async let bookingsTask: () = loadBookings()
        async let earningsTask: () = loadEarnings()

        _ = await (profileTask, bookingsTask, earningsTask)

        isLoading = false
    }

    private func loadProfile() async {
        do {
            profile = try await APIService.shared.getWorkerProfile()
        } catch {
            print("Profile error: \(error)")
        }
    }

    private func loadBookings() async {
        do {
            let response = try await APIService.shared.getBookings()
            let bookings = response.bookings

            pendingBookings = bookings.filter { $0.status == "PENDING" }

            let today = ISO8601DateFormatter().string(from: Date()).prefix(10)
            todayBookings = bookings.filter {
                ["CONFIRMED", "IN_PROGRESS"].contains($0.status) &&
                $0.scheduledDate.hasPrefix(String(today))
            }
        } catch {
            print("Bookings error: \(error)")
        }
    }

    private func loadEarnings() async {
        do {
            earnings = try await APIService.shared.getWorkerEarnings()
        } catch {
            print("Earnings error: \(error)")
        }
    }

    func acceptBooking(_ bookingId: String) async {
        isUpdatingStatus = true
        do {
            _ = try await APIService.shared.updateBookingStatus(id: bookingId, status: "CONFIRMED")
            await loadDashboard()
        } catch {
            self.error = "Failed to accept booking"
        }
        isUpdatingStatus = false
    }

    func declineBooking(_ bookingId: String) async {
        isUpdatingStatus = true
        do {
            _ = try await APIService.shared.cancelBooking(id: bookingId, reason: "Worker declined")
            await loadDashboard()
        } catch {
            self.error = "Failed to decline booking"
        }
        isUpdatingStatus = false
    }

    func startJob(_ bookingId: String) async {
        isUpdatingStatus = true
        do {
            _ = try await APIService.shared.updateBookingStatus(id: bookingId, status: "IN_PROGRESS")
            await loadDashboard()
        } catch {
            self.error = "Failed to start job"
        }
        isUpdatingStatus = false
    }

    func completeJob(_ bookingId: String) async {
        isUpdatingStatus = true
        do {
            _ = try await APIService.shared.updateBookingStatus(id: bookingId, status: "COMPLETED")
            await loadDashboard()
        } catch {
            self.error = "Failed to complete job"
        }
        isUpdatingStatus = false
    }
}

struct WorkerDashboardView: View {
    @StateObject private var viewModel = WorkerDashboardViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Stats
                HStack(spacing: 12) {
                    StatCard(
                        title: "Rating",
                        value: viewModel.profile?.rating.map { String(format: "%.1f", $0) } ?? "--",
                        icon: "star.fill"
                    )
                    StatCard(
                        title: "Jobs Done",
                        value: viewModel.profile?.completedJobs.map { "\($0)" } ?? "--",
                        icon: "checkmark.circle.fill"
                    )
                }
                .padding(.horizontal)

                // Earnings
                EarningsCard(earnings: viewModel.earnings)
                    .padding(.horizontal)

                // Pending Requests
                if !viewModel.pendingBookings.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pending Requests (\(viewModel.pendingBookings.count))")
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(viewModel.pendingBookings) { booking in
                            PendingBookingCard(
                                booking: booking,
                                onAccept: {
                                    Task { await viewModel.acceptBooking(booking.id) }
                                },
                                onDecline: {
                                    Task { await viewModel.declineBooking(booking.id) }
                                },
                                isLoading: viewModel.isUpdatingStatus
                            )
                            .padding(.horizontal)
                        }
                    }
                }

                // Today's Schedule
                VStack(alignment: .leading, spacing: 12) {
                    Text("Today's Schedule")
                        .font(.headline)
                        .padding(.horizontal)

                    if viewModel.todayBookings.isEmpty {
                        HStack {
                            Spacer()
                            VStack(spacing: 8) {
                                Image(systemName: "calendar.badge.checkmark")
                                    .font(.system(size: 32))
                                    .foregroundColor(.secondary)
                                Text("No jobs scheduled for today")
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 32)
                            Spacer()
                        }
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .padding(.horizontal)
                    } else {
                        ForEach(viewModel.todayBookings) { booking in
                            TodayJobCard(
                                booking: booking,
                                onStart: {
                                    Task { await viewModel.startJob(booking.id) }
                                },
                                onComplete: {
                                    Task { await viewModel.completeJob(booking.id) }
                                },
                                isLoading: viewModel.isUpdatingStatus
                            )
                            .padding(.horizontal)
                        }
                    }
                }

                // Quick Actions
                VStack(alignment: .leading, spacing: 12) {
                    Text("Quick Actions")
                        .font(.headline)
                        .padding(.horizontal)

                    HStack(spacing: 12) {
                        QuickActionCard(icon: "calendar", title: "Availability") {
                            // TODO
                        }
                        NavigationLink(destination: BookingsView()) {
                            QuickActionCard(icon: "clock.arrow.circlepath", title: "Job History") {
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal)
                }

                Spacer()
                    .frame(height: 32)
            }
            .padding(.vertical)
        }
        .navigationTitle("Worker Dashboard")
        .refreshable {
            await viewModel.loadDashboard()
        }
        .task {
            await viewModel.loadDashboard()
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.accentColor)
            Text(value)
                .font(.title)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

struct EarningsCard: View {
    let earnings: [String: Any]

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "eurosign.circle.fill")
                    .foregroundColor(.accentColor)
                Text("My Earnings")
                    .font(.headline)
                Spacer()
            }

            HStack(spacing: 32) {
                EarningItem(label: "This Week", value: formatEarning(earnings["thisWeek"]))
                EarningItem(label: "This Month", value: formatEarning(earnings["thisMonth"]))
                EarningItem(label: "Total", value: formatEarning(earnings["total"]))
            }
        }
        .padding()
        .background(Color.accentColor.opacity(0.1))
        .cornerRadius(12)
    }

    private func formatEarning(_ value: Any?) -> String {
        if let num = value as? Double {
            return "€\(Int(num))"
        } else if let num = value as? Int {
            return "€\(num)"
        }
        return "€0"
    }
}

struct EarningItem: View {
    let label: String
    let value: String

    var body: some View {
        VStack {
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.accentColor)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct PendingBookingCard: View {
    let booking: Booking
    let onAccept: () -> Void
    let onDecline: () -> Void
    let isLoading: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(booking.service?.name ?? "Service")
                    .fontWeight(.semibold)
                Spacer()
                Text("€\(String(format: "%.2f", booking.totalPrice))")
                    .fontWeight(.bold)
                    .foregroundColor(.accentColor)
            }

            if let customer = booking.customer {
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color.accentColor.opacity(0.1))
                        .frame(width: 24, height: 24)
                        .overlay(
                            Text(customer.initials.prefix(1))
                                .font(.caption2)
                                .foregroundColor(.accentColor)
                        )
                    Text(customer.fullName)
                        .font(.subheadline)
                }
            }

            HStack(spacing: 12) {
                Label(booking.scheduledDate, systemImage: "calendar")
                    .font(.caption)
                Label(booking.scheduledTime, systemImage: "clock")
                    .font(.caption)
            }
            .foregroundColor(.secondary)

            Label(booking.address, systemImage: "location")
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(1)

            HStack(spacing: 8) {
                Button(action: onDecline) {
                    Text("Decline")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(.red)
                .disabled(isLoading)

                Button(action: onAccept) {
                    Text("Accept")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

struct TodayJobCard: View {
    let booking: Booking
    let onStart: () -> Void
    let onComplete: () -> Void
    let isLoading: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(booking.scheduledTime)
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
                StatusBadge(status: booking.status)
            }

            Text(booking.service?.name ?? "Service")
                .fontWeight(.semibold)

            Label(booking.address, systemImage: "location")
                .font(.caption)
                .foregroundColor(.secondary)
                .lineLimit(1)

            HStack(spacing: 8) {
                NavigationLink(destination: BookingDetailView(bookingId: booking.id)) {
                    Label("Details", systemImage: "info.circle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                if booking.isConfirmed {
                    Button(action: onStart) {
                        Text("On My Way")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isLoading)
                } else if booking.isInProgress {
                    Button(action: onComplete) {
                        Text("Complete Job")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isLoading)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

struct QuickActionCard: View {
    let icon: String
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(.accentColor)
                Text(title)
                    .font(.subheadline)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 5)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    NavigationStack {
        WorkerDashboardView()
    }
}
