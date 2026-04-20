import SwiftUI

@MainActor
class HomeViewModel: ObservableObject {
    @Published var services: [Service] = []
    @Published var upcomingBookings: [Booking] = []
    @Published var featuredWorkers: [Worker] = []
    @Published var isLoading = true
    @Published var error: String?

    func loadData() async {
        isLoading = true
        error = nil

        async let servicesTask: () = loadServices()
        async let bookingsTask: () = loadBookings()
        async let workersTask: () = loadWorkers()

        _ = await (servicesTask, bookingsTask, workersTask)

        isLoading = false
    }

    private func loadServices() async {
        do {
            services = try await APIService.shared.getServices()
        } catch {
            print("Services error: \(error)")
        }
    }

    private func loadBookings() async {
        do {
            let response = try await APIService.shared.getBookings(status: "PENDING,CONFIRMED,IN_PROGRESS")
            upcomingBookings = Array(response.bookings.prefix(3))
        } catch {
            print("Bookings error: \(error)")
        }
    }

    private func loadWorkers() async {
        do {
            featuredWorkers = try await APIService.shared.getWorkers(minRating: 4.5)
            featuredWorkers = Array(featuredWorkers.prefix(6))
        } catch {
            print("Workers error: \(error)")
        }
    }
}

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Search Bar
                    NavigationLink(destination: SearchView()) {
                        HStack {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.secondary)
                            Text("Search for services...")
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)

                    // Services
                    if !viewModel.services.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Services")
                                .font(.title3)
                                .fontWeight(.bold)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(viewModel.services) { service in
                                        ServiceCard(service: service)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    // Upcoming Bookings
                    if !viewModel.upcomingBookings.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Upcoming Bookings")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                Spacer()
                                NavigationLink("View All") {
                                    BookingsView()
                                }
                                .font(.subheadline)
                            }
                            .padding(.horizontal)

                            ForEach(viewModel.upcomingBookings) { booking in
                                NavigationLink(destination: BookingDetailView(bookingId: booking.id)) {
                                    BookingCard(booking: booking)
                                }
                                .buttonStyle(.plain)
                                .padding(.horizontal)
                            }
                        }
                    }

                    // Featured Workers
                    if !viewModel.featuredWorkers.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Top Rated Professionals")
                                .font(.title3)
                                .fontWeight(.bold)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(viewModel.featuredWorkers) { worker in
                                        NavigationLink(destination: WorkerProfileView(workerId: worker.id)) {
                                            WorkerCard(worker: worker)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    // Worker Dashboard Button (for workers)
                    if authManager.currentUser?.isWorker == true {
                        NavigationLink(destination: WorkerDashboardView()) {
                            HStack {
                                Image(systemName: "rectangle.grid.2x2.fill")
                                    .font(.title2)
                                VStack(alignment: .leading) {
                                    Text("Worker Dashboard")
                                        .fontWeight(.semibold)
                                    Text("Manage your jobs and earnings")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                            }
                            .padding()
                            .background(Color.accentColor.opacity(0.1))
                            .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Hello, \(authManager.currentUser?.firstName ?? "there")")
            .refreshable {
                await viewModel.loadData()
            }
            .task {
                await viewModel.loadData()
            }
        }
    }
}

struct ServiceCard: View {
    let service: Service

    var body: some View {
        VStack(spacing: 8) {
            Circle()
                .fill(Color.accentColor.opacity(0.1))
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: serviceIcon)
                        .foregroundColor(.accentColor)
                )

            Text(service.name)
                .font(.caption)
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
        .frame(width: 80)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }

    private var serviceIcon: String {
        switch service.name.lowercased() {
        case let name where name.contains("clean"): return "sparkles"
        case let name where name.contains("garden"): return "leaf.fill"
        case let name where name.contains("plumb"): return "wrench.fill"
        case let name where name.contains("electric"): return "bolt.fill"
        case let name where name.contains("paint"): return "paintbrush.fill"
        case let name where name.contains("move") || name.contains("deliver"): return "shippingbox.fill"
        default: return "hammer.fill"
        }
    }
}

struct BookingCard: View {
    let booking: Booking

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(statusColor.opacity(0.1))
                .frame(width: 48, height: 48)
                .overlay(
                    Image(systemName: statusIcon)
                        .foregroundColor(statusColor)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(booking.service?.name ?? "Service")
                    .fontWeight(.semibold)
                Text("\(booking.scheduledDate) at \(booking.scheduledTime)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(booking.status.replacingOccurrences(of: "_", with: " "))
                    .font(.caption2)
                    .foregroundColor(statusColor)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }

    private var statusColor: Color {
        switch booking.status {
        case "PENDING": return .orange
        case "CONFIRMED": return .blue
        case "IN_PROGRESS": return .green
        case "COMPLETED": return .blue
        case "CANCELLED": return .red
        default: return .gray
        }
    }

    private var statusIcon: String {
        switch booking.status {
        case "PENDING": return "clock"
        case "CONFIRMED": return "checkmark.circle"
        case "IN_PROGRESS": return "figure.walk"
        case "COMPLETED": return "checkmark.seal"
        case "CANCELLED": return "xmark.circle"
        default: return "info.circle"
        }
    }
}

struct WorkerCard: View {
    let worker: Worker

    var body: some View {
        VStack(spacing: 8) {
            Circle()
                .fill(Color.accentColor.opacity(0.1))
                .frame(width: 64, height: 64)
                .overlay(
                    Text(worker.initials)
                        .fontWeight(.bold)
                        .foregroundColor(.accentColor)
                )

            Text(worker.fullName)
                .fontWeight(.semibold)
                .lineLimit(1)

            if let rating = worker.rating {
                HStack(spacing: 2) {
                    Image(systemName: "star.fill")
                        .font(.caption)
                        .foregroundColor(.yellow)
                    Text(String(format: "%.1f", rating))
                        .font(.caption)
                }
            }

            if worker.verified == true {
                HStack(spacing: 2) {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.caption2)
                        .foregroundColor(.accentColor)
                    Text("Verified")
                        .font(.caption2)
                        .foregroundColor(.accentColor)
                }
            }
        }
        .frame(width: 140)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
    }
}

#Preview {
    HomeView()
        .environmentObject(AuthManager())
}
