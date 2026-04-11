import SwiftUI

struct HomeView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = HomeViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerSection

                    // Quick Actions
                    quickActionsSection

                    // Categories
                    categoriesSection

                    // Featured Workers
                    if !viewModel.featuredWorkers.isEmpty {
                        featuredWorkersSection
                    }

                    // Recent Bookings
                    if !viewModel.recentBookings.isEmpty {
                        recentBookingsSection
                    }
                }
                .padding()
            }
            .navigationTitle("Home")
            .refreshable {
                await viewModel.refresh()
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Hello, \(authManager.currentUser?.firstName ?? "there")!")
                .font(.title2)
                .fontWeight(.bold)

            Text("What service do you need today?")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var quickActionsSection: some View {
        HStack(spacing: 12) {
            NavigationLink {
                AIChatView()
            } label: {
                QuickActionCard(
                    icon: "sparkles",
                    title: "AI Assistant",
                    color: .purple
                )
            }

            NavigationLink {
                SmartMatchView()
            } label: {
                QuickActionCard(
                    icon: "person.2.fill",
                    title: "Smart Match",
                    color: .blue
                )
            }

            NavigationLink {
                SmartScheduleView()
            } label: {
                QuickActionCard(
                    icon: "calendar.badge.clock",
                    title: "Schedule",
                    color: .green
                )
            }
        }
    }

    private var categoriesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Categories")
                .font(.headline)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(viewModel.categories) { category in
                    NavigationLink {
                        SearchView(categoryId: category.id)
                    } label: {
                        CategoryCard(category: category)
                    }
                }
            }
        }
    }

    private var featuredWorkersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Top Rated")
                    .font(.headline)
                Spacer()
                NavigationLink("See All") {
                    SearchView()
                }
                .font(.subheadline)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(viewModel.featuredWorkers) { worker in
                        NavigationLink {
                            WorkerProfileView(workerId: worker.id)
                        } label: {
                            WorkerCard(worker: worker)
                        }
                    }
                }
            }
        }
    }

    private var recentBookingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Bookings")
                    .font(.headline)
                Spacer()
                NavigationLink("See All") {
                    BookingsView()
                }
                .font(.subheadline)
            }

            ForEach(viewModel.recentBookings.prefix(3)) { booking in
                NavigationLink {
                    BookingDetailView(bookingId: booking.id)
                } label: {
                    BookingRow(booking: booking)
                }
            }
        }
    }
}

struct QuickActionCard: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)

            Text(title)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(color.opacity(0.1))
        .cornerRadius(12)
    }
}

struct CategoryCard: View {
    let category: Category

    var body: some View {
        HStack {
            Text(category.emoji ?? "🏠")
                .font(.title2)

            Text(category.name)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.primary)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct WorkerCard: View {
    let worker: Worker

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Avatar
            Circle()
                .fill(Color(.systemGray4))
                .frame(width: 60, height: 60)
                .overlay {
                    Image(systemName: "person.fill")
                        .foregroundStyle(.white)
                }

            // Name
            Text(worker.fullName)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.primary)
                .lineLimit(1)

            // Profession
            if let profession = worker.profession {
                Text(profession)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            // Rating
            HStack(spacing: 4) {
                Image(systemName: "star.fill")
                    .font(.caption)
                    .foregroundStyle(.yellow)
                Text(String(format: "%.1f", worker.rating))
                    .font(.caption)
                    .foregroundStyle(.primary)
            }
        }
        .frame(width: 100)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct BookingRow: View {
    let booking: Booking

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(booking.service?.name ?? "Service")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)

                Text("\(booking.formattedDate) at \(booking.formattedTime)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            StatusBadge(status: booking.status)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct StatusBadge: View {
    let status: BookingStatus

    var body: some View {
        Text(status.displayName)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.2))
            .foregroundStyle(statusColor)
            .cornerRadius(8)
    }

    private var statusColor: Color {
        switch status {
        case .pending: return .orange
        case .confirmed: return .blue
        case .inProgress: return .purple
        case .completed: return .green
        case .cancelled: return .red
        }
    }
}

#Preview {
    HomeView()
        .environmentObject(AuthManager.shared)
}
