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
    val locationCountry: String? = null
)

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
    val notes: String? = null
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
