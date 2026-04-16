import SwiftUI

struct CreateBookingView: View {
    let workerId: String
    @StateObject private var viewModel: CreateBookingViewModel
    @Environment(\.dismiss) private var dismiss

    init(workerId: String) {
        self.workerId = workerId
        _viewModel = StateObject(wrappedValue: CreateBookingViewModel(workerId: workerId))
    }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView("Loading...")
                } else if let error = viewModel.error, viewModel.worker == nil {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                            .foregroundStyle(.red)
                        Text(error)
                            .foregroundStyle(.secondary)
                        Button("Retry") {
                            Task { await viewModel.loadWorker() }
                        }
                    }
                } else {
                    bookingForm
                }
            }
            .navigationTitle("Book Service")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $viewModel.showPayment) {
                if let booking = viewModel.createdBooking {
                    BookingConfirmationView(booking: booking) {
                        dismiss()
                    }
                }
            }
            .alert("Error", isPresented: .constant(viewModel.error != nil && viewModel.worker != nil)) {
                Button("OK") { viewModel.error = nil }
            } message: {
                Text(viewModel.error ?? "")
            }
        }
    }

    private var bookingForm: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Worker Card
                if let worker = viewModel.worker {
                    workerCard(worker)
                }

                // Service Selection
                if !viewModel.services.isEmpty {
                    serviceSection
                }

                // Date & Time
                dateTimeSection

                // Duration
                durationSection

                // Address
                addressSection

                // Notes
                notesSection

                // Price Summary
                priceSummary

                // Book Button
                bookButton
            }
            .padding()
        }
    }

    private func workerCard(_ worker: Worker) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: worker.avatar ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Circle().fill(Color.gray.opacity(0.3))
            }
            .frame(width: 60, height: 60)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text("\(worker.firstName) \(worker.lastName)")
                    .font(.headline)

                if let profile = worker.workerProfile {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .foregroundStyle(.yellow)
                            .font(.caption)
                        Text(String(format: "%.1f", profile.averageRating))
                            .font(.subheadline)
                        Text("(\(profile.totalBookings) jobs)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Text("€\(Int(profile.hourlyRate))/hr")
                        .font(.subheadline)
                        .foregroundStyle(.green)
                }
            }

            Spacer()
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var serviceSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Select Service")
                .font(.headline)

            ForEach(viewModel.services, id: \.id) { service in
                serviceRow(service)
            }
        }
    }

    private func serviceRow(_ service: Service) -> some View {
        Button {
            if viewModel.selectedService?.id == service.id {
                viewModel.selectedService = nil
            } else {
                viewModel.selectedService = service
            }
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(service.name)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if let description = service.description {
                        Text(description)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Text("€\(Int(service.basePrice))")
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Image(systemName: viewModel.selectedService?.id == service.id ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(viewModel.selectedService?.id == service.id ? .accentColor : .gray)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(viewModel.selectedService?.id == service.id ? Color.accentColor : Color.gray.opacity(0.3), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var dateTimeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Date & Time")
                .font(.headline)

            HStack(spacing: 16) {
                DatePicker("Date", selection: $viewModel.selectedDate, in: Date()..., displayedComponents: .date)
                    .labelsHidden()

                DatePicker("Time", selection: $viewModel.selectedTime, displayedComponents: .hourAndMinute)
                    .labelsHidden()
            }
        }
    }

    private var durationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Duration")
                    .font(.headline)
                Spacer()
                Text("\(viewModel.duration) hour\(viewModel.duration > 1 ? "s" : "")")
                    .foregroundStyle(.secondary)
            }

            Stepper("", value: $viewModel.duration, in: 1...8)
                .labelsHidden()

            HStack {
                ForEach([1, 2, 3, 4], id: \.self) { hours in
                    Button {
                        viewModel.duration = hours
                    } label: {
                        Text("\(hours)h")
                            .font(.caption)
                            .fontWeight(.medium)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(viewModel.duration == hours ? Color.accentColor : Color(.systemGray5))
                            .foregroundStyle(viewModel.duration == hours ? .white : .primary)
                            .cornerRadius(8)
                    }
                }
            }
        }
    }

    private var addressSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Address")
                .font(.headline)

            TextField("Street address", text: $viewModel.address)
                .textFieldStyle(.roundedBorder)

            TextField("City (optional)", text: $viewModel.city)
                .textFieldStyle(.roundedBorder)
        }
    }

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Notes (optional)")
                .font(.headline)

            TextField("Special instructions...", text: $viewModel.notes, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(3...5)
        }
    }

    private var priceSummary: some View {
        VStack(spacing: 12) {
            Divider()

            HStack {
                Text("Estimated Total")
                    .font(.headline)
                Spacer()
                Text(viewModel.formattedPrice)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.green)
            }

            Text("Final price may vary based on actual service duration")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var bookButton: some View {
        Button {
            Task { await viewModel.createBooking() }
        } label: {
            HStack {
                if viewModel.isCreating {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Book Now")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(viewModel.isFormValid ? Color.accentColor : Color.gray)
            .foregroundStyle(.white)
            .cornerRadius(12)
        }
        .disabled(!viewModel.isFormValid || viewModel.isCreating)
    }
}

// MARK: - Booking Confirmation View

struct BookingConfirmationView: View {
    let booking: Booking
    let onDismiss: () -> Void
    @State private var showPayment = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                // Success Icon
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(.green)

                Text("Booking Created!")
                    .font(.title)
                    .fontWeight(.bold)

                Text("Your booking request has been sent to the worker.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                // Booking Summary
                VStack(alignment: .leading, spacing: 12) {
                    if let worker = booking.cleaner {
                        summaryRow(icon: "person.fill", title: "Worker", value: "\(worker.firstName) \(worker.lastName)")
                    }

                    summaryRow(icon: "calendar", title: "Date", value: booking.formattedDate)
                    summaryRow(icon: "clock", title: "Time", value: booking.formattedTime)

                    if let address = booking.address {
                        summaryRow(icon: "location.fill", title: "Address", value: address)
                    }

                    Divider()

                    HStack {
                        Text("Total")
                            .font(.headline)
                        Spacer()
                        Text(String(format: "€%.2f", booking.totalPrice))
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundStyle(.green)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal)

                Spacer()

                // Action Buttons
                VStack(spacing: 12) {
                    Button {
                        showPayment = true
                    } label: {
                        Text("Pay Now")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.accentColor)
                            .foregroundStyle(.white)
                            .cornerRadius(12)
                    }

                    Button {
                        onDismiss()
                    } label: {
                        Text("Pay Later")
                            .fontWeight(.medium)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.systemGray5))
                            .foregroundStyle(.primary)
                            .cornerRadius(12)
                    }
                }
                .padding(.horizontal)
            }
            .padding()
            .navigationTitle("Booking Confirmed")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showPayment) {
                PaymentView(bookingId: booking.id) {
                    onDismiss()
                }
            }
        }
    }

    private func summaryRow(icon: String, title: String, value: String) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundStyle(.secondary)
                .frame(width: 24)
            Text(title)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
        .font(.subheadline)
    }
}

#Preview {
    CreateBookingView(workerId: "1")
}
