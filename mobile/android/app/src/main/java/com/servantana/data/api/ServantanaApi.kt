package com.servantana.data.api

import com.servantana.data.model.*
import retrofit2.Response
import retrofit2.http.*

/**
 * Servantana API Service
 * Consumes the Next.js backend API
 */
interface ServantanaApi {

    // ============================================
    // AUTH
    // ============================================

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<SuccessResponse>

    @GET("auth/session")
    suspend fun getSession(): Response<User>

    // ============================================
    // SERVICES
    // ============================================

    @GET("services")
    suspend fun getServices(): Response<List<Service>>

    @GET("services/{id}")
    suspend fun getService(@Path("id") id: String): Response<Service>

    // ============================================
    // WORKERS
    // ============================================

    @GET("workers")
    suspend fun getWorkers(
        @Query("serviceId") serviceId: String? = null,
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radius") radius: Int? = null,
        @Query("minRating") minRating: Double? = null
    ): Response<List<Worker>>

    @GET("workers/{id}")
    suspend fun getWorker(@Path("id") id: String): Response<Worker>

    @GET("workers/{id}/reviews")
    suspend fun getWorkerReviews(@Path("id") id: String): Response<List<Review>>

    @GET("workers/{id}/availability")
    suspend fun getWorkerAvailability(
        @Path("id") id: String,
        @Query("date") date: String
    ): Response<List<String>> // List of available time slots

    // ============================================
    // BOOKINGS
    // ============================================

    @GET("bookings")
    suspend fun getBookings(
        @Query("status") status: String? = null
    ): Response<BookingsListResponse>

    @GET("bookings/{id}")
    suspend fun getBooking(@Path("id") id: String): Response<BookingResponse>

    @POST("bookings")
    suspend fun createBooking(@Body request: CreateBookingRequest): Response<BookingResponse>

    @PATCH("bookings/{id}")
    suspend fun updateBookingStatus(
        @Path("id") id: String,
        @Body status: Map<String, String>
    ): Response<BookingResponse>

    @POST("bookings/{id}/cancel")
    suspend fun cancelBooking(
        @Path("id") id: String,
        @Body reason: Map<String, String>? = null
    ): Response<SuccessResponse>

    // ============================================
    // TRACKING
    // ============================================

    @GET("bookings/{id}/tracking")
    suspend fun getTracking(@Path("id") bookingId: String): Response<TrackingData>

    @POST("bookings/{id}/tracking")
    suspend fun updateTracking(
        @Path("id") bookingId: String,
        @Body request: UpdateLocationRequest
    ): Response<SuccessResponse>

    // ============================================
    // MESSAGES
    // ============================================

    @GET("messages")
    suspend fun getConversations(): Response<ConversationsResponse>

    @GET("messages/{partnerId}")
    suspend fun getMessages(@Path("partnerId") partnerId: String): Response<MessagesResponse>

    @POST("messages")
    suspend fun sendMessage(@Body request: SendMessageRequest): Response<Message>

    @POST("messages/{partnerId}/read")
    suspend fun markMessagesRead(@Path("partnerId") partnerId: String): Response<SuccessResponse>

    // ============================================
    // PAYMENTS
    // ============================================

    @POST("payments/create-intent")
    suspend fun createPaymentIntent(@Body request: CreatePaymentRequest): Response<PaymentIntent>

    @POST("payments/confirm")
    suspend fun confirmPayment(@Body paymentIntentId: Map<String, String>): Response<SuccessResponse>

    // ============================================
    // REVIEWS
    // ============================================

    @POST("reviews")
    suspend fun createReview(@Body request: CreateReviewRequest): Response<Review>

    // ============================================
    // USER PROFILE
    // ============================================

    @GET("user/profile")
    suspend fun getProfile(): Response<User>

    @PATCH("user/profile")
    suspend fun updateProfile(@Body updates: Map<String, String>): Response<User>

    // ============================================
    // WORKER PROFILE (for workers)
    // ============================================

    @GET("worker/profile")
    suspend fun getWorkerProfile(): Response<WorkerProfile>

    @PATCH("worker/profile")
    suspend fun updateWorkerProfile(@Body updates: Map<String, Any>): Response<WorkerProfile>

    @GET("worker/earnings")
    suspend fun getWorkerEarnings(
        @Query("period") period: String = "month"
    ): Response<Map<String, Any>>

    // ============================================
    // PRESENCE
    // ============================================

    @POST("presence")
    suspend fun sendHeartbeat(): Response<SuccessResponse>

    @GET("presence")
    suspend fun checkPresence(
        @Query("userIds") userIds: String
    ): Response<Map<String, Any>>

    // ============================================
    // PUSH NOTIFICATIONS
    // ============================================

    @POST("user/notifications/push/mobile")
    suspend fun registerPushToken(@Body token: Map<String, String>): Response<SuccessResponse>
}
