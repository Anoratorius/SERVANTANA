package com.servantana.data.model

import kotlinx.serialization.Serializable

// ============================================
// AUTH MODELS
// ============================================

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String,
    val phone: String? = null,
    val role: String = "CUSTOMER"
)

@Serializable
data class AuthResponse(
    val user: User,
    val token: String
)

@Serializable
data class User(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val phone: String? = null,
    val avatar: String? = null,
    val role: String,
    val isEmailVerified: Boolean = false,
    val createdAt: String? = null
) {
    val fullName: String get() = "$firstName $lastName"
    val isWorker: Boolean get() = role == "CLEANER"
    val isCustomer: Boolean get() = role == "CUSTOMER"
}

// ============================================
// SERVICE MODELS
// ============================================

@Serializable
data class Service(
    val id: String,
    val name: String,
    val description: String? = null,
    val icon: String? = null,
    val basePrice: Double? = null,
    val priceUnit: String? = null,
    val category: String? = null
)

// ============================================
// WORKER MODELS
// ============================================

@Serializable
data class Worker(
    val id: String,
    val firstName: String,
    val lastName: String,
    val avatar: String? = null,
    val rating: Double? = null,
    val reviewCount: Int = 0,
    val hourlyRate: Double? = null,
    val bio: String? = null,
    val verified: Boolean = false,
    val services: List<Service> = emptyList(),
    val distance: Double? = null
) {
    val fullName: String get() = "$firstName $lastName"
}

@Serializable
data class WorkerProfile(
    val id: String,
    val userId: String,
    val bio: String? = null,
    val hourlyRate: Double? = null,
    val experience: Int? = null,
    val address: String? = null,
    val city: String? = null,
    val country: String? = null,
    val verified: Boolean = false,
    val rating: Double? = null,
    val completedJobs: Int = 0
)

// ============================================
// BOOKING MODELS
// ============================================

@Serializable
data class Booking(
    val id: String,
    val status: String,
    val scheduledDate: String,
    val scheduledTime: String,
    val duration: Int? = null,
    val address: String,
    val city: String? = null,
    val totalPrice: Double,
    val currency: String = "EUR",
    val notes: String? = null,
    val service: Service? = null,
    val customer: User? = null,
    val cleaner: User? = null,
    val createdAt: String? = null
) {
    val isPending: Boolean get() = status == "PENDING"
    val isConfirmed: Boolean get() = status == "CONFIRMED"
    val isInProgress: Boolean get() = status == "IN_PROGRESS"
    val isCompleted: Boolean get() = status == "COMPLETED"
    val isCancelled: Boolean get() = status == "CANCELLED"
}

@Serializable
data class CreateBookingRequest(
    val serviceId: String,
    val cleanerId: String,
    val scheduledDate: String,
    val scheduledTime: String,
    val duration: Int,
    val address: String,
    val city: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val notes: String? = null
)

@Serializable
data class BookingResponse(
    val booking: Booking
)

@Serializable
data class BookingsListResponse(
    val bookings: List<Booking>
)

// ============================================
// TRACKING MODELS
// ============================================

@Serializable
data class TrackingData(
    val trackingActive: Boolean,
    val workerLocation: LocationData? = null,
    val destination: LocationData? = null,
    val estimatedArrival: String? = null,
    val distanceKm: Double? = null,
    val cleanerName: String? = null,
    val status: String? = null
)

@Serializable
data class LocationData(
    val latitude: Double,
    val longitude: Double,
    val lastUpdate: String? = null,
    val address: String? = null
)

@Serializable
data class UpdateLocationRequest(
    val latitude: Double,
    val longitude: Double,
    val action: String? = null // "start", "stop", or null for update
)

// ============================================
// MESSAGE MODELS
// ============================================

@Serializable
data class Message(
    val id: String,
    val content: String,
    val senderId: String,
    val receiverId: String,
    val read: Boolean = false,
    val createdAt: String,
    val sender: User? = null,
    val receiver: User? = null
)

@Serializable
data class Conversation(
    val partnerId: String,
    val partner: User,
    val lastMessage: MessagePreview,
    val unreadCount: Int = 0
)

@Serializable
data class MessagePreview(
    val id: String,
    val content: String,
    val createdAt: String,
    val senderId: String,
    val read: Boolean
)

@Serializable
data class SendMessageRequest(
    val receiverId: String,
    val content: String,
    val bookingId: String? = null
)

@Serializable
data class ConversationsResponse(
    val conversations: List<Conversation>
)

@Serializable
data class MessagesResponse(
    val messages: List<Message>
)

// ============================================
// PAYMENT MODELS
// ============================================

@Serializable
data class PaymentIntent(
    val clientSecret: String,
    val paymentIntentId: String,
    val amount: Double,
    val currency: String
)

@Serializable
data class CreatePaymentRequest(
    val bookingId: String,
    val provider: String = "stripe"
)

// ============================================
// REVIEW MODELS
// ============================================

@Serializable
data class Review(
    val id: String,
    val rating: Int,
    val comment: String? = null,
    val createdAt: String,
    val reviewer: User? = null
)

@Serializable
data class CreateReviewRequest(
    val bookingId: String,
    val rating: Int,
    val comment: String? = null
)

// ============================================
// API RESPONSE WRAPPERS
// ============================================

@Serializable
data class ApiError(
    val error: String,
    val details: String? = null
)

@Serializable
data class SuccessResponse(
    val message: String? = null,
    val success: Boolean = true
)
