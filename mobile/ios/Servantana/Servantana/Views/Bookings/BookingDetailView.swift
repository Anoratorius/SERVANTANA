import SwiftUI

@MainActor
class BookingDetailViewModel: ObservableObject {
    @Published var booking: Booking?
    @Published var isLoading = true
    @Published var error: String?
    @Published var isCancelling = false

    let bookingId: String

    init(bookingId: String) {
        self.bookingId = bookingId
    }

    func loadBooking() async {
        isLoading = true
        error = nil

        do {
            let response = try await APIService.shared.getBooking(id: bookingId)
            booking = response.booking
        } catch APIError.serverError(let message) {
            error = message
        } catch {
            self.error = "Failed to load booking"
        }

        isLoading = false
    }

    func cancelBooking() async -> Bool {
        isCancelling = true

        do {
            _ = try await APIService.shared.cancelBooking(id: bookingId)
            isCancelling = false
            return true
        } catch {
            isCancelling = false
            return false
        }
    }
}

struct BookingDetailView: View {
    let bookingId: String
    @StateObject private var viewModel: BookingDetailViewModel
    @State private var showCancelAlert = false
    @Environment(\.dismiss) private var dismiss

    init(bookingId: String) {
        self.bookingId = bookingId
        self._viewModel = StateObject(wrappedValue: BookingDetailViewModel(bookingId: bookingId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else if let error = viewModel.error {
                VStack(spacing: 16) {
                    Text(error)
                        .foregroundColor(.red)
                    Button("Retry") {
                        Task {
                            await viewModel.loadBooking()
                        }
                    }
                }
            } else if let booking = viewModel.booking {
                ScrollView {
                    VStack(spacing: 16) {
                        // Status Header
                        StatusHeader(booking: booking)

                        // Service Info
                        SectionCard(title: "Service") {
                            HStack {
                                Image(systemName: "sparkles")
                                    .foregroundColor(.accentColor)
                                VStack(alignment: .leading) {
                                    Text(booking.service?.name ?? "Service")
                                        .fontWeight(.semibold)
                                    if let duration = booking.duration {
                                        Text("\(duration) hours")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                Spacer()
                            }
                        }

                        // Worker Info
                        if let cleaner = booking.cleaner {
                            SectionCard(title: "Professional") {
                                HStack {
                                    Circle()
                                        .fill(Color.accentColor.opacity(0.1))
                                        .frame(width: 48, height: 48)
                                        .overlay(
                                            Text(cleaner.initials)
                                                .fontWeight(.bold)
                                                .foregroundColor(.accentColor)
                                        )
                                    VStack(alignment: .leading) {
                                        Text(cleaner.fullName)
                                            .fontWeight(.semibold)
                                        if let phone = cleaner.phone {
                                            Text(phone)
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                    Spacer()
                                    NavigationLink(destination: ConversationView(partnerId: cleaner.id)) {
                                        Image(systemName: "message.fill")
                                            .foregroundColor(.accentColor)
                                    }
                                }
                            }
                        }

                        // Date & Time
                        SectionCard(title: "Date & Time") {
                            HStack {
                                Label(booking.scheduledDate, systemImage: "calendar")
                                Spacer()
                                Label(booking.scheduledTime, systemImage: "clock")
                            }
                        }

                        // Location
                        SectionCard(title: "Location") {
                            HStack(alignment: .top) {
                                Image(systemName: "location.fill")
                                    .foregroundColor(.accentColor)
                                VStack(alignment: .leading) {
                                    Text(booking.address)
                                    if let city = booking.city {
                                        Text(city)
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                Spacer()
                            }
                        }

                        // Notes
                        if let notes = booking.notes, !notes.isEmpty {
                            SectionCard(title: "Notes") {
                                Text(notes)
                            }
                        }

                        // Payment
                        SectionCard(title: "Payment") {
                            HStack {
                                Text("Total")
                                Spacer()
                                Text("€\(String(format: "%.2f", booking.totalPrice))")
                                    .fontWeight(.bold)
                                    .foregroundColor(.accentColor)
                            }
                        }

                        // Actions
                        VStack(spacing: 12) {
                            if booking.isInProgress {
                                NavigationLink(destination: TrackingView(bookingId: booking.id)) {
                                    Label("Track Worker", systemImage: "location.fill")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.borderedProminent)
                            }

                            if booking.isPending || booking.isConfirmed {
                                Button(action: { showCancelAlert = true }) {
                                    Label("Cancel Booking", systemImage: "xmark.circle")
                                        .frame(maxWidth: .infinity)
                                }
                                .buttonStyle(.bordered)
                                .tint(.red)
                            }
                        }
                        .padding()
                    }
                }
            }
        }
        .navigationTitle("Booking Details")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadBooking()
        }
        .alert("Cancel Booking?", isPresented: $showCancelAlert) {
            Button("No, Keep It", role: .cancel) { }
            Button("Yes, Cancel", role: .destructive) {
                Task {
                    if await viewModel.cancelBooking() {
                        dismiss()
                    }
                }
            }
        } message: {
            Text("Are you sure you want to cancel this booking? This action cannot be undone.")
        }
    }
}

struct StatusHeader: View {
    let booking: Booking

    var body: some View {
        HStack {
            Image(systemName: statusIcon)
                .font(.title)
                .foregroundColor(statusColor)
            VStack(alignment: .leading) {
                Text(statusTitle)
                    .fontWeight(.bold)
                    .foregroundColor(statusColor)
                Text(statusDescription)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(statusColor.opacity(0.1))
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

    private var statusTitle: String {
        switch booking.status {
        case "PENDING": return "Awaiting Confirmation"
        case "CONFIRMED": return "Booking Confirmed"
        case "IN_PROGRESS": return "In Progress"
        case "COMPLETED": return "Completed"
        case "CANCELLED": return "Cancelled"
        default: return booking.status
        }
    }

    private var statusDescription: String {
        switch booking.status {
        case "PENDING": return "Waiting for the professional to confirm"
        case "CONFIRMED": return "Your booking is confirmed and scheduled"
        case "IN_PROGRESS": return "The professional is on their way or working"
        case "COMPLETED": return "Service has been completed"
        case "CANCELLED": return "This booking was cancelled"
        default: return ""
        }
    }
}

struct SectionCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            content()
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
        .padding(.horizontal)
    }
}

#Preview {
    NavigationStack {
        BookingDetailView(bookingId: "123")
    }
}
