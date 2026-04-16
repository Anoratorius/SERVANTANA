import SwiftUI

struct BookingDetailView: View {
    let bookingId: String
    @StateObject private var viewModel: BookingDetailViewModel
    @State private var showCancelAlert = false
    @State private var showReviewSheet = false

    init(bookingId: String) {
        self.bookingId = bookingId
        _viewModel = StateObject(wrappedValue: BookingDetailViewModel(bookingId: bookingId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                ProgressView()
                    .padding(.top, 100)
            } else if let booking = viewModel.booking {
                VStack(spacing: 24) {
                    // Status card
                    statusCard(booking: booking)

                    // Service details
                    detailsCard(booking: booking)

                    // Worker info
                    if let worker = booking.cleaner {
                        workerCard(worker: worker)
                    }

                    // Address
                    if let address = booking.address {
                        addressCard(address: address, city: booking.city)
                    }

                    // Actions
                    actionsSection(booking: booking)
                }
                .padding()
            }
        }
        .navigationTitle("Booking Details")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Cancel Booking", isPresented: $showCancelAlert) {
            Button("Cancel Booking", role: .destructive) {
                Task {
                    await viewModel.cancelBooking()
                }
            }
            Button("Keep Booking", role: .cancel) {}
        } message: {
            Text("Are you sure you want to cancel this booking?")
        }
        .sheet(isPresented: $showReviewSheet) {
            ReviewSubmissionView(bookingId: bookingId) {
                Task {
                    await viewModel.loadBooking()
                }
            }
        }
    }

    private func statusCard(booking: Booking) -> some View {
        VStack(spacing: 12) {
            StatusBadge(status: booking.status)

            Text(booking.service?.name ?? "Service")
                .font(.title2)
                .fontWeight(.bold)

            Text("\(Int(booking.totalPrice)) \(booking.currency)")
                .font(.title3)
                .foregroundStyle(.blue)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }

    private func detailsCard(booking: Booking) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Details")
                .font(.headline)

            HStack {
                DetailRow(icon: "calendar", title: "Date", value: booking.formattedDate)
                Spacer()
                DetailRow(icon: "clock", title: "Time", value: booking.formattedTime)
            }

            DetailRow(icon: "hourglass", title: "Duration", value: "\(booking.duration) hours")

            if let notes = booking.notes, !notes.isEmpty {
                DetailRow(icon: "note.text", title: "Notes", value: notes)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }

    private func workerCard(worker: Worker) -> some View {
        NavigationLink {
            WorkerProfileView(workerId: worker.id)
        } label: {
            HStack(spacing: 12) {
                Circle()
                    .fill(Color(.systemGray4))
                    .frame(width: 50, height: 50)
                    .overlay {
                        Image(systemName: "person.fill")
                            .foregroundStyle(.white)
                    }

                VStack(alignment: .leading, spacing: 4) {
                    Text(worker.fullName)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    if let profession = worker.profession {
                        Text(profession)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(16)
        }
    }

    private func addressCard(address: String, city: String?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Location")
                .font(.headline)

            HStack {
                Image(systemName: "mappin.circle.fill")
                    .foregroundStyle(.red)
                VStack(alignment: .leading) {
                    Text(address)
                    if let city = city {
                        Text(city)
                            .foregroundStyle(.secondary)
                    }
                }
                .font(.subheadline)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }

    private func actionsSection(booking: Booking) -> some View {
        VStack(spacing: 12) {
            // Leave review button for completed bookings without review
            if booking.status == .completed && booking.review == nil {
                Button {
                    showReviewSheet = true
                } label: {
                    Label("Leave a Review", systemImage: "star.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.yellow.opacity(0.2))
                        .foregroundStyle(.orange)
                        .cornerRadius(12)
                }
            }

            // Show existing review
            if let review = booking.review {
                reviewCard(review: review)
            }

            if let worker = booking.cleaner {
                NavigationLink {
                    ChatView(userId: worker.id)
                } label: {
                    Label("Message Worker", systemImage: "message.fill")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .cornerRadius(12)
                }
            }

            if booking.status == .pending || booking.status == .confirmed {
                Button {
                    showCancelAlert = true
                } label: {
                    Label("Cancel Booking", systemImage: "xmark.circle")
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .foregroundStyle(.red)
                        .cornerRadius(12)
                }
            }
        }
    }

    private func reviewCard(review: Review) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Your Review")
                    .font(.headline)
                Spacer()
                HStack(spacing: 2) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: star <= review.rating ? "star.fill" : "star")
                            .font(.caption)
                            .foregroundStyle(star <= review.rating ? .yellow : Color(.systemGray3))
                    }
                }
            }

            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Text(review.formattedDate)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct DetailRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                Text(title)
                    .font(.caption)
            }
            .foregroundStyle(.secondary)

            Text(value)
                .font(.subheadline)
        }
    }
}

#Preview {
    NavigationStack {
        BookingDetailView(bookingId: "1")
    }
}
