import Foundation
import SwiftUI

enum OnboardingStep: Int, CaseIterable {
    case profile = 0
    case professions = 1
    case availability = 2
    case documents = 3
    case stripeConnect = 4
    case goLive = 5

    var title: String {
        switch self {
        case .profile: return "Profile"
        case .professions: return "Services"
        case .availability: return "Schedule"
        case .documents: return "Documents"
        case .stripeConnect: return "Payments"
        case .goLive: return "Go Live"
        }
    }

    var description: String {
        switch self {
        case .profile: return "Set up your professional profile"
        case .professions: return "Select the services you offer"
        case .availability: return "Set your working hours"
        case .documents: return "Upload verification documents"
        case .stripeConnect: return "Connect your payment account"
        case .goLive: return "Review and start receiving bookings"
        }
    }

    var icon: String {
        switch self {
        case .profile: return "person.fill"
        case .professions: return "briefcase.fill"
        case .availability: return "calendar"
        case .documents: return "doc.fill"
        case .stripeConnect: return "creditcard.fill"
        case .goLive: return "checkmark.seal.fill"
        }
    }
}

@MainActor
class WorkerOnboardingManager: ObservableObject {
    static let shared = WorkerOnboardingManager()

    @Published var currentStep: OnboardingStep = .profile
    @Published var isLoading = false
    @Published var error: String?

    // Profile data
    @Published var profile: WorkerProfile?
    @Published var firstName = ""
    @Published var lastName = ""
    @Published var phone = ""
    @Published var bio = ""
    @Published var hourlyRate: Double = 25.0
    @Published var experienceYears: Int = 0
    @Published var city = ""
    @Published var country = "DE"
    @Published var serviceRadius: Int = 25
    @Published var ecoFriendly = false
    @Published var petFriendly = false

    // Professions
    @Published var availableProfessions: [Profession] = []
    @Published var categories: [Category] = []
    @Published var selectedProfessions: Set<String> = []
    @Published var primaryProfessionId: String?
    @Published var workerProfessions: [WorkerProfession] = []

    // Availability
    @Published var availability: [DayAvailability] = []

    // Documents
    @Published var documents: [WorkerDocument] = []
    @Published var isUploadingDocument = false

    // Stripe Connect
    @Published var stripeStatus: StripeConnectStatus?
    @Published var stripeOnboardingUrl: String?

    // Step completion status
    @Published var profileComplete = false
    @Published var professionsComplete = false
    @Published var availabilityComplete = false
    @Published var documentsComplete = false
    @Published var stripeComplete = false

    struct DayAvailability: Identifiable {
        let id = UUID()
        let dayOfWeek: Int
        var dayName: String
        var isEnabled: Bool
        var startTime: Date
        var endTime: Date

        static let defaultStartTime: Date = {
            var components = DateComponents()
            components.hour = 9
            components.minute = 0
            return Calendar.current.date(from: components) ?? Date()
        }()

        static let defaultEndTime: Date = {
            var components = DateComponents()
            components.hour = 17
            components.minute = 0
            return Calendar.current.date(from: components) ?? Date()
        }()
    }

    private init() {
        initializeAvailability()
    }

    private func initializeAvailability() {
        let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        availability = days.enumerated().map { index, name in
            DayAvailability(
                dayOfWeek: index,
                dayName: name,
                isEnabled: index >= 1 && index <= 5, // Monday-Friday enabled by default
                startTime: DayAvailability.defaultStartTime,
                endTime: DayAvailability.defaultEndTime
            )
        }
    }

    func loadInitialData() async {
        isLoading = true
        error = nil

        do {
            // Load profile
            async let profileResponse = APIClient.shared.getWorkerProfile()
            async let categoriesResponse = APIClient.shared.getCategories()
            async let professionsResponse = APIClient.shared.getProfessions()

            let (profile, categories, professions) = try await (profileResponse, categoriesResponse, professionsResponse)

            self.profile = profile.profile
            self.categories = categories.categories
            self.availableProfessions = professions.professions

            // Populate form with existing data
            firstName = profile.user.firstName
            lastName = profile.user.lastName
            phone = profile.user.phone ?? ""

            if let workerProfile = profile.profile {
                bio = workerProfile.bio ?? ""
                hourlyRate = workerProfile.hourlyRate
                experienceYears = workerProfile.experienceYears ?? 0
                city = workerProfile.city ?? ""
                country = workerProfile.country ?? "DE"
                serviceRadius = workerProfile.serviceRadius ?? 25
                ecoFriendly = workerProfile.ecoFriendly
                petFriendly = workerProfile.petFriendly

                // Load professions
                if let profs = workerProfile.professions {
                    workerProfessions = profs
                    selectedProfessions = Set(profs.map { $0.professionId })
                    primaryProfessionId = profs.first(where: { $0.isPrimary })?.professionId
                }

                // Load availability
                if let avail = workerProfile.availability {
                    for serverAvail in avail {
                        if let index = availability.firstIndex(where: { $0.dayOfWeek == serverAvail.dayOfWeek }) {
                            availability[index].isEnabled = serverAvail.isEnabled
                            availability[index].startTime = parseTime(serverAvail.startTime) ?? DayAvailability.defaultStartTime
                            availability[index].endTime = parseTime(serverAvail.endTime) ?? DayAvailability.defaultEndTime
                        }
                    }
                }

                updateCompletionStatus()
            }

            // Load documents
            let docsResponse = try await APIClient.shared.getWorkerDocuments()
            documents = docsResponse.documents

            // Load Stripe status
            stripeStatus = try await APIClient.shared.getStripeConnectStatus()
            stripeComplete = stripeStatus?.onboardingComplete ?? false

        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func updateCompletionStatus() {
        profileComplete = !bio.isEmpty && hourlyRate > 0 && !city.isEmpty
        professionsComplete = !selectedProfessions.isEmpty && primaryProfessionId != nil
        availabilityComplete = availability.contains { $0.isEnabled }
        documentsComplete = documents.contains { $0.status == .verified || $0.status == .pending }
        stripeComplete = stripeStatus?.onboardingComplete ?? false
    }

    // MARK: - Profile

    func saveProfile() async -> Bool {
        isLoading = true
        error = nil

        do {
            let request = WorkerProfileUpdateRequest(
                firstName: firstName,
                lastName: lastName,
                phone: phone.isEmpty ? nil : phone,
                bio: bio.isEmpty ? nil : bio,
                hourlyRate: hourlyRate,
                experienceYears: experienceYears,
                ecoFriendly: ecoFriendly,
                petFriendly: petFriendly,
                city: city.isEmpty ? nil : city,
                country: country.isEmpty ? nil : country,
                serviceRadius: serviceRadius
            )

            let response = try await APIClient.shared.updateWorkerProfile(request)
            profile = response.profile
            profileComplete = true
            isLoading = false
            return true
        } catch {
            self.error = error.localizedDescription
            isLoading = false
            return false
        }
    }

    // MARK: - Professions

    func toggleProfession(_ professionId: String) {
        if selectedProfessions.contains(professionId) {
            selectedProfessions.remove(professionId)
            if primaryProfessionId == professionId {
                primaryProfessionId = selectedProfessions.first
            }
        } else {
            selectedProfessions.insert(professionId)
            if primaryProfessionId == nil {
                primaryProfessionId = professionId
            }
        }
    }

    func saveProfessions() async -> Bool {
        isLoading = true
        error = nil

        do {
            // Get current professions
            let currentIds = Set(workerProfessions.map { $0.professionId })

            // Remove professions that are no longer selected
            for profId in currentIds where !selectedProfessions.contains(profId) {
                _ = try await APIClient.shared.removeWorkerProfession(professionId: profId)
            }

            // Add new professions
            for profId in selectedProfessions where !currentIds.contains(profId) {
                _ = try await APIClient.shared.addWorkerProfession(
                    professionId: profId,
                    isPrimary: profId == primaryProfessionId
                )
            }

            // Set primary profession
            if let primaryId = primaryProfessionId {
                _ = try await APIClient.shared.setPrimaryProfession(professionId: primaryId)
            }

            // Refresh professions
            let response = try await APIClient.shared.getWorkerProfessions()
            workerProfessions = response.professions
            professionsComplete = true

            isLoading = false
            return true
        } catch {
            self.error = error.localizedDescription
            isLoading = false
            return false
        }
    }

    // MARK: - Availability

    func saveAvailability() async -> Bool {
        isLoading = true
        error = nil

        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "HH:mm"

            let slots = availability.map { day in
                SetAvailabilityRequest.AvailabilitySlot(
                    dayOfWeek: day.dayOfWeek,
                    startTime: formatter.string(from: day.startTime),
                    endTime: formatter.string(from: day.endTime),
                    isEnabled: day.isEnabled
                )
            }

            let request = SetAvailabilityRequest(availability: slots)
            _ = try await APIClient.shared.setWorkerAvailability(request)
            availabilityComplete = true

            isLoading = false
            return true
        } catch {
            self.error = error.localizedDescription
            isLoading = false
            return false
        }
    }

    // MARK: - Documents

    func uploadDocument(data: Data, fileName: String, mimeType: String, type: DocumentType) async -> Bool {
        isUploadingDocument = true
        error = nil

        do {
            let response = try await APIClient.shared.uploadDocument(
                data: data,
                fileName: fileName,
                mimeType: mimeType,
                type: type
            )
            documents.append(response.document)
            documentsComplete = true
            isUploadingDocument = false
            return true
        } catch {
            self.error = error.localizedDescription
            isUploadingDocument = false
            return false
        }
    }

    func refreshDocuments() async {
        do {
            let response = try await APIClient.shared.getWorkerDocuments()
            documents = response.documents
            documentsComplete = documents.contains { $0.status == .verified || $0.status == .pending }
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Stripe Connect

    func createStripeAccount() async -> String? {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.createStripeConnectAccount(country: country)
            stripeOnboardingUrl = response.url
            isLoading = false
            return response.url
        } catch {
            self.error = error.localizedDescription
            isLoading = false
            return nil
        }
    }

    func refreshStripeStatus() async {
        do {
            stripeStatus = try await APIClient.shared.checkStripeConnectStatus()
            stripeComplete = stripeStatus?.onboardingComplete ?? false
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Complete Onboarding

    func completeOnboarding() async -> Bool {
        isLoading = true
        error = nil

        do {
            let response = try await APIClient.shared.completeOnboarding()
            isLoading = false
            return response.onboardingComplete
        } catch let apiError as APIError {
            if case .httpError(_, let message) = apiError,
               let message = message,
               let data = message.data(using: .utf8),
               let errorResponse = try? JSONDecoder().decode(OnboardingErrorResponse.self, from: data) {
                self.error = errorResponse.details?.joined(separator: "\n") ?? errorResponse.error
            } else {
                self.error = apiError.localizedDescription
            }
            isLoading = false
            return false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
            return false
        }
    }

    // MARK: - Navigation

    func nextStep() {
        if let nextIndex = OnboardingStep(rawValue: currentStep.rawValue + 1) {
            currentStep = nextIndex
        }
    }

    func previousStep() {
        if let prevIndex = OnboardingStep(rawValue: currentStep.rawValue - 1) {
            currentStep = prevIndex
        }
    }

    func goToStep(_ step: OnboardingStep) {
        currentStep = step
    }

    func canProceed() -> Bool {
        switch currentStep {
        case .profile:
            return profileComplete
        case .professions:
            return professionsComplete
        case .availability:
            return availabilityComplete
        case .documents:
            return documentsComplete
        case .stripeConnect:
            return stripeComplete
        case .goLive:
            return true
        }
    }

    // MARK: - Helpers

    private func parseTime(_ timeString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.date(from: timeString)
    }

    func reset() {
        currentStep = .profile
        profile = nil
        firstName = ""
        lastName = ""
        phone = ""
        bio = ""
        hourlyRate = 25.0
        experienceYears = 0
        city = ""
        country = "DE"
        serviceRadius = 25
        ecoFriendly = false
        petFriendly = false
        availableProfessions = []
        categories = []
        selectedProfessions = []
        primaryProfessionId = nil
        workerProfessions = []
        documents = []
        stripeStatus = nil
        stripeOnboardingUrl = nil
        profileComplete = false
        professionsComplete = false
        availabilityComplete = false
        documentsComplete = false
        stripeComplete = false
        initializeAvailability()
    }
}
