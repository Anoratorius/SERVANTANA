package com.servantana.app.data.api

import com.servantana.app.data.model.*
import retrofit2.http.*

interface ServantanaApi {

    // ==================== Auth ====================
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("auth/logout")
    suspend fun logout(): ApiResponse

    @GET("user/me")
    suspend fun getCurrentUser(): UserResponse

    // ==================== Workers ====================
    @GET("workers")
    suspend fun getWorkers(
        @Query("lat") latitude: Double? = null,
        @Query("lng") longitude: Double? = null,
        @Query("maxDistance") maxDistance: Int? = null,
        @Query("professionId") professionId: String? = null,
        @Query("categoryId") categoryId: String? = null,
        @Query("minRating") minRating: Float? = null,
        @Query("maxPrice") maxPrice: Float? = null,
        @Query("ecoFriendly") ecoFriendly: Boolean? = null,
        @Query("petFriendly") petFriendly: Boolean? = null
    ): WorkersResponse

    @GET("workers/{id}")
    suspend fun getWorker(@Path("id") workerId: String): WorkerDetailResponse

    // ==================== Bookings ====================
    @GET("bookings")
    suspend fun getBookings(
        @Query("status") status: String? = null
    ): BookingsResponse

    @GET("bookings/{id}")
    suspend fun getBooking(@Path("id") bookingId: String): BookingDetailResponse

    @POST("bookings")
    suspend fun createBooking(@Body request: CreateBookingRequest): BookingResponse

    @PATCH("bookings/{id}")
    suspend fun updateBooking(
        @Path("id") bookingId: String,
        @Body request: UpdateBookingRequest
    ): BookingResponse

    @POST("bookings/{id}/cancel")
    suspend fun cancelBooking(
        @Path("id") bookingId: String,
        @Body request: CancelBookingRequest
    ): BookingResponse

    // ==================== Messages ====================
    @GET("messages")
    suspend fun getConversations(): ConversationsResponse

    @GET("messages/{conversationId}")
    suspend fun getMessages(
        @Path("conversationId") conversationId: String,
        @Query("limit") limit: Int = 50,
        @Query("before") before: String? = null
    ): MessagesResponse

    @POST("messages")
    suspend fun sendMessage(@Body request: SendMessageRequest): MessageResponse

    // ==================== Favorites ====================
    @GET("favorites")
    suspend fun getFavorites(): FavoritesResponse

    @POST("favorites")
    suspend fun addFavorite(@Body request: AddFavoriteRequest): ApiResponse

    @DELETE("favorites/{workerId}")
    suspend fun removeFavorite(@Path("workerId") workerId: String): ApiResponse

    // ==================== Reviews ====================
    @GET("reviews/worker/{workerId}")
    suspend fun getWorkerReviews(@Path("workerId") workerId: String): ReviewsResponse

    @POST("reviews")
    suspend fun createReview(@Body request: CreateReviewRequest): ReviewResponse

    // ==================== Categories & Professions ====================
    @GET("categories")
    suspend fun getCategories(): CategoriesResponse

    @GET("professions")
    suspend fun getProfessions(
        @Query("categoryId") categoryId: String? = null
    ): ProfessionsResponse

    // ==================== AI Features ====================
    @POST("ai/chat")
    suspend fun aiChat(@Body request: AIChatRequest): AIChatResponse

    @POST("ai/smart-match")
    suspend fun smartMatch(@Body request: SmartMatchRequest): SmartMatchResponse

    @POST("ai/schedule")
    suspend fun smartSchedule(@Body request: SmartScheduleRequest): SmartScheduleResponse

    @POST("ai/reviews")
    suspend fun reviewInsights(@Body request: ReviewInsightsRequest): ReviewInsightsResponse

    @POST("ai/photo")
    suspend fun analyzePhoto(@Body request: PhotoAnalysisRequest): PhotoAnalysisResponse

    @POST("ai/estimate")
    suspend fun estimatePrice(@Body request: PriceEstimateRequest): PriceEstimateResponse

    @POST("ai/route-optimize")
    suspend fun optimizeRoute(@Body request: RouteOptimizeRequest): RouteOptimizeResponse

    // ==================== Profile ====================
    @PATCH("user/me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): UpdateProfileResponse

    @POST("auth/forgot-password")
    suspend fun forgotPassword(@Body request: PasswordResetRequest): ApiResponse

    @POST("auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): ApiResponse

    // ==================== Payments ====================
    @POST("payments/mobile/create-intent")
    suspend fun createPaymentIntent(@Body request: PaymentIntentRequest): PaymentIntentResponse
}
