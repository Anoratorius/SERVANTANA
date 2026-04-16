import Foundation
import SwiftUI

@MainActor
class CreateBookingViewModel: ObservableObject {
    // Worker info
    @Published var worker: Worker?
    @Published var services: [Service] = []

    // Form state
    @Published var selectedService: Service?
    @Published var selectedDate = Date()
    @Published var selectedTime = Date()
    @Published var duration: Int = 2
    @Published var address = ""
    @Published var city = ""
    @Published var notes = ""

    // UI state
    @Published var isLoading = false
    @Published var isCreating = false
    @Published var error: String?
    @Published var createdBooking: Booking?
    @Published var showPayment = false

    private let workerId: String

    var estimatedPrice: Float {
        if let service = selectedService {
            return service.basePrice * Float(duration)
        }
        if let hourlyRate = worker?.workerProfile?.hourlyRate {
            return Float(hourlyRate) * Float(duration)
        }
        return 0
    }

    var formattedPrice: String {
        String(format: "€%.2f", estimatedPrice)
    }

    var isFormValid: Bool {
        !address.isEmpty && duration > 0
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: selectedDate)
    }

    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: selectedTime)
    }

    init(workerId: String) {
        self.workerId = workerId
        Task {
            await loadWorker()
        }
    }

    func loadWorker() async {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.getWorker(id: workerId)
            worker = Worker(
                id: response.worker.id,
                email: "",
                firstName: response.worker.firstName,
                lastName: response.worker.lastName,
                avatar: response.worker.avatar,
                role: "WORKER",
                workerProfile: response.worker.workerProfile
            )

            // Extract services from worker profile
            if let workerServices = response.worker.workerProfile?.services {
                services = workerServices.map { $0.service }
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func createBooking() async {
        guard isFormValid else {
            error = "Please fill in all required fields"
            return
        }

        isCreating = true
        error = nil

        do {
            let request = CreateBookingRequest(
                cleanerId: workerId,
                serviceId: selectedService?.id,
                scheduledDate: formattedDate,
                scheduledTime: formattedTime,
                duration: duration * 60, // Convert hours to minutes
                address: address,
                city: city.isEmpty ? nil : city,
                postalCode: nil,
                latitude: nil,
                longitude: nil,
                notes: notes.isEmpty ? nil : notes,
                totalPrice: estimatedPrice
            )

            let response = try await APIClient.shared.createBooking(request)
            createdBooking = response.booking
            showPayment = true
        } catch {
            self.error = error.localizedDescription
        }

        isCreating = false
    }
}
