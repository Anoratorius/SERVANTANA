import SwiftUI

@MainActor
class BookServiceViewModel: ObservableObject {
    @Published var worker: Worker?
    @Published var availableSlots: [String] = []
    @Published var selectedService: Service?
    @Published var selectedDate = Date()
    @Published var selectedTime = ""
    @Published var duration = 2
    @Published var address = ""
    @Published var city = ""
    @Published var notes = ""
    @Published var isLoading = true
    @Published var isBooking = false
    @Published var error: String?
    @Published var bookingSuccess = false
    @Published var newBookingId: String?

    let workerId: String

    init(workerId: String) {
        self.workerId = workerId
    }

    func loadWorker() async {
        isLoading = true

        do {
            worker = try await APIService.shared.getWorker(id: workerId)
            selectedService = worker?.services?.first
        } catch {
            self.error = "Failed to load worker"
        }

        isLoading = false
    }

    func loadAvailability() async {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateString = formatter.string(from: selectedDate)

        do {
            availableSlots = try await APIService.shared.getWorkerAvailability(id: workerId, date: dateString)
            selectedTime = ""
        } catch {
            availableSlots = []
        }
    }

    func createBooking() async {
        guard let service = selectedService else {
            error = "Please select a service"
            return
        }

        guard !selectedTime.isEmpty else {
            error = "Please select a time"
            return
        }

        guard !address.isEmpty else {
            error = "Please enter your address"
            return
        }

        isBooking = true
        error = nil

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let request = CreateBookingRequest(
            serviceId: service.id,
            cleanerId: workerId,
            scheduledDate: formatter.string(from: selectedDate),
            scheduledTime: selectedTime,
            duration: duration,
            address: address,
            city: city.isEmpty ? nil : city,
            latitude: nil,
            longitude: nil,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            let response = try await APIService.shared.createBooking(request)
            newBookingId = response.booking.id
            bookingSuccess = true
        } catch APIError.serverError(let message) {
            error = message
        } catch {
            self.error = "Booking failed"
        }

        isBooking = false
    }
}

struct BookServiceView: View {
    let workerId: String
    @StateObject private var viewModel: BookServiceViewModel
    @Environment(\.dismiss) private var dismiss

    init(workerId: String) {
        self.workerId = workerId
        self._viewModel = StateObject(wrappedValue: BookServiceViewModel(workerId: workerId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else if let worker = viewModel.worker {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Worker Info
                        HStack(spacing: 12) {
                            Circle()
                                .fill(Color.accentColor.opacity(0.1))
                                .frame(width: 48, height: 48)
                                .overlay(
                                    Text(worker.initials)
                                        .fontWeight(.bold)
                                        .foregroundColor(.accentColor)
                                )

                            VStack(alignment: .leading) {
                                Text(worker.fullName)
                                    .fontWeight(.semibold)
                                if let rating = worker.rating {
                                    HStack(spacing: 2) {
                                        Image(systemName: "star.fill")
                                            .font(.caption)
                                            .foregroundColor(.yellow)
                                        Text(String(format: "%.1f", rating))
                                            .font(.caption)
                                    }
                                }
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)

                        // Service Selection
                        if let services = worker.services, !services.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Select Service")
                                    .font(.headline)

                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(services) { service in
                                            Button(action: { viewModel.selectedService = service }) {
                                                Text(service.name)
                                                    .font(.subheadline)
                                                    .padding(.horizontal, 12)
                                                    .padding(.vertical, 8)
                                                    .background(viewModel.selectedService?.id == service.id ? Color.accentColor : Color(.systemGray6))
                                                    .foregroundColor(viewModel.selectedService?.id == service.id ? .white : .primary)
                                                    .cornerRadius(20)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Date Selection
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Select Date")
                                .font(.headline)

                            DatePicker("", selection: $viewModel.selectedDate, in: Date()..., displayedComponents: .date)
                                .datePickerStyle(.graphical)
                                .onChange(of: viewModel.selectedDate) { _, _ in
                                    Task {
                                        await viewModel.loadAvailability()
                                    }
                                }
                        }

                        // Time Selection
                        if !viewModel.availableSlots.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Select Time")
                                    .font(.headline)

                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(viewModel.availableSlots, id: \.self) { slot in
                                            Button(action: { viewModel.selectedTime = slot }) {
                                                Text(slot)
                                                    .font(.subheadline)
                                                    .padding(.horizontal, 12)
                                                    .padding(.vertical, 8)
                                                    .background(viewModel.selectedTime == slot ? Color.accentColor : Color(.systemGray6))
                                                    .foregroundColor(viewModel.selectedTime == slot ? .white : .primary)
                                                    .cornerRadius(20)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Duration
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Duration (hours)")
                                .font(.headline)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach([1, 2, 3, 4, 6, 8], id: \.self) { hours in
                                        Button(action: { viewModel.duration = hours }) {
                                            Text("\(hours) hr\(hours > 1 ? "s" : "")")
                                                .font(.subheadline)
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 8)
                                                .background(viewModel.duration == hours ? Color.accentColor : Color(.systemGray6))
                                                .foregroundColor(viewModel.duration == hours ? .white : .primary)
                                                .cornerRadius(20)
                                        }
                                    }
                                }
                            }
                        }

                        // Address
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Your Address")
                                .font(.headline)

                            TextField("Street Address", text: $viewModel.address)
                                .textFieldStyle(.roundedBorder)

                            TextField("City", text: $viewModel.city)
                                .textFieldStyle(.roundedBorder)
                        }

                        // Notes
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Additional Notes (optional)")
                                .font(.headline)

                            TextField("Special instructions...", text: $viewModel.notes, axis: .vertical)
                                .lineLimit(3...5)
                                .textFieldStyle(.roundedBorder)
                        }

                        // Price Summary
                        if let rate = worker.hourlyRate {
                            let total = rate * Double(viewModel.duration)
                            HStack {
                                VStack(alignment: .leading) {
                                    Text("Estimated Total")
                                        .font(.subheadline)
                                    Text("\(viewModel.duration) hours × €\(Int(rate))/hr")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Text("€\(String(format: "%.2f", total))")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.accentColor)
                            }
                            .padding()
                            .background(Color.accentColor.opacity(0.1))
                            .cornerRadius(12)
                        }

                        // Error
                        if let error = viewModel.error {
                            Text(error)
                                .foregroundColor(.red)
                                .font(.subheadline)
                        }

                        // Book Button
                        Button(action: {
                            Task {
                                await viewModel.createBooking()
                            }
                        }) {
                            if viewModel.isBooking {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Label("Confirm Booking", systemImage: "checkmark.circle")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(isFormValid ? Color.accentColor : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .disabled(!isFormValid || viewModel.isBooking)

                        Spacer()
                            .frame(height: 32)
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Book Now")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadWorker()
            await viewModel.loadAvailability()
        }
        .onChange(of: viewModel.bookingSuccess) { _, success in
            if success {
                dismiss()
            }
        }
    }

    private var isFormValid: Bool {
        viewModel.selectedService != nil &&
        !viewModel.selectedTime.isEmpty &&
        !viewModel.address.isEmpty
    }
}

#Preview {
    NavigationStack {
        BookServiceView(workerId: "123")
    }
}
