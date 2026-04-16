package com.servantana.app.data.model

import kotlinx.serialization.Serializable

// ==================== Common ====================
@Serializable
data class ApiResponse(
    val success: Boolean = true,
    val message: String? = null
)

// ==================== Auth ====================
@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
    val rememberMe: Boolean = true
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String,
    val role: String = "CUSTOMER"
)

@Serializable
data class AuthResponse(
    val token: String,
    val user: User
)

@Serializable
data class UserResponse(
    val user: User
)

@Serializable
data class User(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val avatar: String? = null,
    val role: String,
    val phone: String? = null,
    val isEmailVerified: Boolean = false,
    val locationCity: String? = null,
    val locationCountry: String? = null,
    val onboardingComplete: Boolean? = null
) {
    val needsWorkerOnboarding: Boolean
        get() = role == "WORKER" && onboardingComplete != true
}

// ==================== Workers ====================
@Serializable
data class WorkersResponse(
    val cleaners: List<Worker>
)

@Serializable
data class WorkerDetailResponse(
    val worker: WorkerDetail
)

@Serializable
data class Worker(
    val id: String,
    val email: String = "",
    val firstName: String,
    val lastName: String,
    val avatar: String? = null,
    val role: String = "WORKER",
    val workerProfile: WorkerProfile? = null
)

@Serializable
data class WorkerDetail(
    val id: String,
    val firstName: String,
    val lastName: String,
    val avatar: String? = null,
    val workerProfile: WorkerProfile? = null,
    val reviewsReceived: List<Review> = emptyList()
)

@Serializable
data class WorkerProfile(
    val id: String,
    val bio: String? = null,
    val hourlyRate: Double,
    val currency: String = "EUR",
    val yearsExperience: Int = 0,
    val isVerified: Boolean = false,
    val ecoFriendly: Boolean = false,
    val petFriendly: Boolean = false,
    val city: String? = null,
    val averageRating: Double = 0.0,
    val totalBookings: Int = 0,
    val distance: Float? = null,
    val professions: List<WorkerProfession> = emptyList(),
    val services: List<WorkerService> = emptyList(),
    val availability: List<Availability> = emptyList()
)

@Serializable
data class WorkerProfession(
    val isPrimary: Boolean = false,
    val profession: Profession
)

@Serializable
data class Profession(
    val id: String,
    val name: String,
    val nameDE: String? = null,
    val emoji: String? = null,
    val category: Category? = null
)

@Serializable
data class Category(
    val id: String,
    val name: String,
    val nameDE: String? = null,
    val emoji: String? = null,
    val gradient: String? = null
)

@Serializable
data class WorkerService(
    val customPrice: Float? = null,
    val service: Service
)

@Serializable
data class Service(
    val id: String,
    val name: String,
    val description: String? = null,
    val basePrice: Float,
    val duration: Int,
    val isSpecialty: Boolean = false
)

@Serializable
data class Availability(
    val dayOfWeek: Int,
    val startTime: String,
    val endTime: String,
    val isActive: Boolean = true
)

// ==================== Bookings ====================
enum class BookingStatus {
    PENDING,
    CONFIRMED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
}

@Serializable
data class Price(
    val amount: Double,
    val currency: String = "EUR"
)

@Serializable
data class BookingsResponse(
    val bookings: List<BookingApiModel>
)

@Serializable
data class BookingResponse(
    val booking: BookingApiModel
)

@Serializable
data class BookingDetailResponse(
    val booking: BookingApiModel
)

@Serializable
data class BookingApiModel(
    val id: String,
    val status: String,
    val scheduledDate: String,
    val scheduledTime: String,
    val duration: Int,
    val totalPrice: Float,
    val currency: String = "EUR",
    val address: String? = null,
    val city: String? = null,
    val notes: String? = null,
    val cleaner: Worker? = null,
    val customer: User? = null,
    val service: Service? = null,
    val review: Review? = null,
    val messages: List<Message> = emptyList()
)

// UI-friendly Booking model
data class Booking(
    val id: String,
    val status: BookingStatus,
    val scheduledDate: java.time.LocalDate,
    val scheduledTime: java.time.LocalTime,
    val duration: Int,
    val totalPrice: Price,
    val address: String? = null,
    val worker: Worker,
    val service: Service,
    val notes: String? = null,
    val review: Review? = null
)

@Serializable
data class CreateBookingRequest(
    val cleanerId: String,
    val serviceId: String? = null,
    val scheduledDate: String,
    val scheduledTime: String,
    val duration: Int,
    val address: String,
    val city: String? = null,
    val postalCode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val notes: String? = null,
    val totalPrice: Float
)

@Serializable
data class UpdateBookingRequest(
    val status: String? = null,
    val scheduledDate: String? = null,
    val scheduledTime: String? = null
)

@Serializable
data class CancelBookingRequest(
    val reason: String? = null
)

// ==================== Messages ====================
@Serializable
data class ConversationsResponse(
    val conversations: List<Conversation>
)

@Serializable
data class MessagesResponse(
    val messages: List<Message>
)

@Serializable
data class MessageResponse(
    val message: Message
)

@Serializable
data class Conversation(
    val id: String,
    val otherUser: User,
    val lastMessage: Message? = null,
    val unreadCount: Int = 0
)

@Serializable
data class Message(
    val id: String,
    val senderId: String,
    val receiverId: String,
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isRead: Boolean = false
)

@Serializable
data class SendMessageRequest(
    val receiverId: String,
    val content: String,
    val bookingId: String? = null
)

// ==================== Reviews ====================
@Serializable
data class ReviewsResponse(
    val reviews: List<Review>
)

@Serializable
data class ReviewResponse(
    val review: Review
)

@Serializable
data class Review(
    val id: String,
    val rating: Int,
    val comment: String? = null,
    val createdAt: String = "",
    val customer: User = User(id = "", email = "", firstName = "", lastName = "", role = "CUSTOMER")
)

@Serializable
data class CreateReviewRequest(
    val bookingId: String,
    val rating: Int,
    val comment: String? = null
)

// ==================== Favorites ====================
@Serializable
data class FavoritesResponse(
    val favorites: List<Favorite>
)

@Serializable
data class Favorite(
    val id: String,
    val cleaner: Worker
)

@Serializable
data class AddFavoriteRequest(
    val cleanerId: String
)

// ==================== Categories ====================
@Serializable
data class CategoriesResponse(
    val categories: List<Category>
)

@Serializable
data class ProfessionsResponse(
    val professions: List<Profession>
)

// ==================== Profile ====================
@Serializable
data class UpdateProfileRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val phone: String? = null
)

@Serializable
data class UpdateProfileResponse(
    val user: User
)

@Serializable
data class PasswordResetRequest(
    val email: String
)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

// ==================== Payments ====================
@Serializable
data class PaymentIntentRequest(
    val bookingId: String
)

@Serializable
data class PaymentIntentResponse(
    val paymentIntent: String,
    val ephemeralKey: String,
    val customer: String,
    val publishableKey: String
)

// ==================== Worker Onboarding ====================
@Serializable
data class WorkerProfileResponse(
    val user: User,
    val profile: WorkerProfileDetail? = null
)

@Serializable
data class WorkerProfileDetail(
    val id: String,
    val userId: String,
    val bio: String? = null,
    val hourlyRate: Double,
    val experienceYears: Int? = null,
    val availableNow: Boolean = false,
    val ecoFriendly: Boolean = false,
    val petFriendly: Boolean = false,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val country: String? = null,
    val postalCode: String? = null,
    val serviceRadius: Int? = null,
    val timezone: String? = null,
    val onboardingComplete: Boolean = false,
    val stripeAccountId: String? = null,
    val stripeOnboardingComplete: Boolean = false,
    val professions: List<WorkerProfessionDetail>? = null,
    val availability: List<WorkerAvailabilitySlot>? = null
)

@Serializable
data class WorkerProfessionDetail(
    val id: String,
    val workerId: String,
    val professionId: String,
    val isPrimary: Boolean = false,
    val profession: Profession? = null
)

@Serializable
data class WorkerAvailabilitySlot(
    val id: String,
    val workerId: String,
    val dayOfWeek: Int,
    val startTime: String,
    val endTime: String,
    val isEnabled: Boolean = true
)

@Serializable
data class WorkerProfileUpdateRequest(
    val firstName: String? = null,
    val lastName: String? = null,
    val phone: String? = null,
    val bio: String? = null,
    val hourlyRate: Double? = null,
    val experienceYears: Int? = null,
    val availableNow: Boolean? = null,
    val ecoFriendly: Boolean? = null,
    val petFriendly: Boolean? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val country: String? = null,
    val postalCode: String? = null,
    val serviceRadius: Int? = null,
    val timezone: String? = null
)

@Serializable
data class WorkerProfileUpdateResponse(
    val message: String,
    val profile: WorkerProfileDetail
)

@Serializable
data class WorkerProfessionsResponse(
    val professions: List<WorkerProfessionDetail>
)

@Serializable
data class AddProfessionRequest(
    val professionId: String,
    val isPrimary: Boolean = false
)

@Serializable
data class UpdatePrimaryProfessionRequest(
    val professionId: String
)

@Serializable
data class SetAvailabilityRequest(
    val availability: List<AvailabilitySlotRequest>
)

@Serializable
data class AvailabilitySlotRequest(
    val dayOfWeek: Int,
    val startTime: String,
    val endTime: String,
    val isEnabled: Boolean
)

@Serializable
data class AvailabilityResponse(
    val availability: List<WorkerAvailabilitySlot>
)

// Worker Documents
enum class DocumentType(val value: String, val displayName: String, val description: String, val isRequired: Boolean) {
    GOVERNMENT_ID("GOVERNMENT_ID", "Government ID", "National ID card or similar", true),
    DRIVERS_LICENSE("DRIVERS_LICENSE", "Driver's License", "Valid driver's license", true),
    PASSPORT("PASSPORT", "Passport", "Valid passport", true),
    BUSINESS_LICENSE("BUSINESS_LICENSE", "Business License", "Business registration or trade license", false),
    INSURANCE_CERTIFICATE("INSURANCE_CERTIFICATE", "Insurance Certificate", "Liability insurance certificate", false),
    BACKGROUND_CHECK("BACKGROUND_CHECK", "Background Check", "Police clearance or background check", false),
    OTHER("OTHER", "Other Document", "Any other relevant document", false)
}

enum class DocumentStatus(val value: String, val displayName: String) {
    PENDING("PENDING", "Pending Review"),
    VERIFIED("VERIFIED", "Verified"),
    REJECTED("REJECTED", "Rejected"),
    EXPIRED("EXPIRED", "Expired")
}

@Serializable
data class WorkerDocument(
    val id: String,
    val cleanerId: String,
    val type: String,
    val fileUrl: String,
    val fileName: String,
    val fileSize: Int,
    val status: String,
    val rejectionReason: String? = null,
    val expiresAt: String? = null,
    val verifiedAt: String? = null,
    val createdAt: String
)

@Serializable
data class DocumentsResponse(
    val documents: List<WorkerDocument>,
    val counts: DocumentCounts
)

@Serializable
data class DocumentCounts(
    val pending: Int,
    val verified: Int,
    val rejected: Int,
    val expired: Int,
    val total: Int
)

@Serializable
data class DocumentUploadResponse(
    val document: WorkerDocument
)

// Stripe Connect
@Serializable
data class StripeConnectStatus(
    val status: String,
    val stripeAccountId: String? = null,
    val onboardingComplete: Boolean = false,
    val dashboardUrl: String? = null
)

@Serializable
data class StripeConnectLinkResponse(
    val url: String,
    val stripeAccountId: String
)

@Serializable
data class CreateStripeAccountRequest(
    val country: String = "DE"
)

@Serializable
data class RefreshStripeRequest(
    val action: String = "refresh"
)

@Serializable
data class CheckStripeRequest(
    val action: String = "check"
)

// Onboarding Completion
@Serializable
data class OnboardingCompleteResponse(
    val message: String,
    val onboardingComplete: Boolean
)

@Serializable
data class OnboardingErrorResponse(
    val error: String,
    val details: List<String>? = null
)

// ==================== Location ====================
@Serializable
data class UpdateLocationRequest(
    val latitude: Double,
    val longitude: Double,
    val city: String? = null,
    val country: String? = null
)

@Serializable
data class LocationUpdateResponse(
    val success: Boolean,
    val user: LocationUser? = null,
    val redirectTo: String? = null
)

@Serializable
data class LocationUser(
    val latitude: Double? = null,
    val longitude: Double? = null,
    val locationCity: String? = null,
    val locationCountry: String? = null,
    val locationVerifiedAt: String? = null
)

@Serializable
data class UserLocationResponse(
    val latitude: Double? = null,
    val longitude: Double? = null,
    val city: String? = null,
    val country: String? = null,
    val verifiedAt: String? = null,
    val isVerified: Boolean = false
)

@Serializable
data class WorkerLocationUpdateRequest(
    val latitude: Double,
    val longitude: Double
)

@Serializable
data class WorkerLocationUpdateResponse(
    val message: String,
    val location: WorkerLocationInfo
)

@Serializable
data class WorkerLocationInfo(
    val latitude: Double? = null,
    val longitude: Double? = null,
    val city: String? = null,
    val country: String? = null,
    val updatedAt: String? = null
)

@Serializable
data class WorkerLocationResponse(
    val location: WorkerLocationDetail
)

@Serializable
data class WorkerLocationDetail(
    val latitude: Double? = null,
    val longitude: Double? = null,
    val city: String? = null,
    val country: String? = null,
    val serviceRadius: Int? = null,
    val availableNow: Boolean? = null,
    val lastUpdated: String? = null
)

// Booking ETA
@Serializable
data class UpdateETARequest(
    val status: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val estimatedArrival: String? = null
)

@Serializable
data class BookingETAUpdateResponse(
    val message: String,
    val booking: ETABookingInfo
)

@Serializable
data class ETABookingInfo(
    val id: String,
    val status: String,
    val etaStatus: String,
    val estimatedArrival: String? = null,
    val workerLocation: WorkerCoordinates? = null
)

@Serializable
data class WorkerCoordinates(
    val latitude: Double,
    val longitude: Double
)

@Serializable
data class BookingETAResponse(
    val booking: ETABookingInfoDetail,
    val worker: ETAWorkerInfo? = null,
    val eta: ETAStatus,
    val customerLocation: CustomerLocation? = null
)

@Serializable
data class ETABookingInfoDetail(
    val id: String,
    val status: String,
    val scheduledDate: String,
    val scheduledTime: String
)

@Serializable
data class ETAWorkerInfo(
    val id: String,
    val firstName: String,
    val lastName: String,
    val avatar: String? = null,
    val location: WorkerLocationCoords? = null
)

@Serializable
data class WorkerLocationCoords(
    val latitude: Double,
    val longitude: Double,
    val lastUpdated: String? = null
)

@Serializable
data class ETAStatus(
    val status: String? = null,
    val distanceKm: Double? = null,
    val estimatedMinutes: Int? = null
)

@Serializable
data class CustomerLocation(
    val latitude: Double,
    val longitude: Double,
    val address: String? = null
)
