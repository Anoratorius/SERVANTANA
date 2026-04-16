package com.servantana.app.data.repository

import com.servantana.app.data.api.ServantanaApi
import com.servantana.app.data.local.TokenManager
import com.servantana.app.data.model.*
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate
import java.time.LocalTime
import javax.inject.Inject

// ==================== Auth Repository ====================
interface AuthRepository {
    val isLoggedIn: Flow<Boolean>
    val userId: Flow<String?>
    val userRole: Flow<String?>
    suspend fun login(email: String, password: String): Result<User>
    suspend fun register(email: String, password: String, firstName: String, lastName: String, role: String = "CUSTOMER"): Result<User>
    suspend fun logout()
    suspend fun getCurrentUser(): Result<User>
    suspend fun sendPasswordResetEmail(email: String): Result<Unit>
    suspend fun changePassword(currentPassword: String, newPassword: String): Result<Unit>
}

class AuthRepositoryImpl @Inject constructor(
    private val api: ServantanaApi,
    private val tokenManager: TokenManager
) : AuthRepository {

    override val isLoggedIn: Flow<Boolean> = tokenManager.isLoggedIn
    override val userId: Flow<String?> = tokenManager.userId
    override val userRole: Flow<String?> = tokenManager.userRole

    override suspend fun login(email: String, password: String): Result<User> {
        return try {
            val response = api.login(LoginRequest(email, password))
            tokenManager.saveToken(response.token)
            tokenManager.saveUser(response.user.id, response.user.role)
            Result.success(response.user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        role: String
    ): Result<User> {
        return try {
            val response = api.register(RegisterRequest(email, password, firstName, lastName, role))
            tokenManager.saveToken(response.token)
            tokenManager.saveUser(response.user.id, response.user.role)
            Result.success(response.user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun logout() {
        try {
            api.logout()
        } catch (_: Exception) { }
        tokenManager.clearAll()
    }

    override suspend fun getCurrentUser(): Result<User> {
        return try {
            val response = api.getCurrentUser()
            Result.success(response.user)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun sendPasswordResetEmail(email: String): Result<Unit> {
        return try {
            api.forgotPassword(PasswordResetRequest(email))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun changePassword(currentPassword: String, newPassword: String): Result<Unit> {
        return try {
            api.changePassword(ChangePasswordRequest(currentPassword, newPassword))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ==================== Worker Repository ====================
interface WorkerRepository {
    suspend fun getWorkers(
        search: String? = null,
        latitude: Double? = null,
        longitude: Double? = null,
        maxDistance: Int? = null,
        professionId: String? = null,
        categoryId: String? = null,
        minRating: Float? = null,
        maxPrice: Float? = null,
        ecoFriendly: Boolean? = null,
        petFriendly: Boolean? = null
    ): Result<List<Worker>>
    suspend fun getWorker(workerId: String): Result<Worker>
}

class WorkerRepositoryImpl @Inject constructor(
    private val api: ServantanaApi
) : WorkerRepository {

    override suspend fun getWorkers(
        search: String?,
        latitude: Double?,
        longitude: Double?,
        maxDistance: Int?,
        professionId: String?,
        categoryId: String?,
        minRating: Float?,
        maxPrice: Float?,
        ecoFriendly: Boolean?,
        petFriendly: Boolean?
    ): Result<List<Worker>> {
        return try {
            val response = api.getWorkers(
                latitude, longitude, maxDistance, professionId, categoryId,
                minRating, maxPrice, ecoFriendly, petFriendly
            )
            var workers = response.cleaners

            // Client-side search filter
            if (!search.isNullOrBlank()) {
                val query = search.lowercase()
                workers = workers.filter { worker ->
                    worker.firstName.lowercase().contains(query) ||
                    worker.lastName.lowercase().contains(query) ||
                    worker.workerProfile?.professions?.any {
                        it.profession.name.lowercase().contains(query)
                    } == true
                }
            }

            Result.success(workers)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getWorker(workerId: String): Result<Worker> {
        return try {
            val response = api.getWorker(workerId)
            // Convert WorkerDetail to Worker
            val detail = response.worker
            Result.success(
                Worker(
                    id = detail.id,
                    firstName = detail.firstName,
                    lastName = detail.lastName,
                    avatar = detail.avatar,
                    workerProfile = detail.workerProfile
                )
            )
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ==================== Booking Repository ====================
interface BookingRepository {
    suspend fun getMyBookings(): Result<List<Booking>>
    suspend fun getBooking(bookingId: String): Result<Booking>
    suspend fun createBooking(
        workerId: String,
        serviceId: String,
        scheduledDate: String,
        scheduledTime: String,
        duration: Int,
        address: String,
        notes: String? = null
    ): Result<Booking>
    suspend fun cancelBooking(bookingId: String): Result<Unit>
}

class BookingRepositoryImpl @Inject constructor(
    private val api: ServantanaApi
) : BookingRepository {

    override suspend fun getMyBookings(): Result<List<Booking>> {
        return try {
            val response = api.getBookings(null)
            Result.success(response.bookings.mapNotNull { it.toBooking() })
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getBooking(bookingId: String): Result<Booking> {
        return try {
            val response = api.getBooking(bookingId)
            response.booking.toBooking()?.let {
                Result.success(it)
            } ?: Result.failure(Exception("Invalid booking data"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createBooking(
        workerId: String,
        serviceId: String,
        scheduledDate: String,
        scheduledTime: String,
        duration: Int,
        address: String,
        notes: String?
    ): Result<Booking> {
        return try {
            val request = CreateBookingRequest(
                cleanerId = workerId,
                serviceId = serviceId,
                scheduledDate = scheduledDate,
                scheduledTime = scheduledTime,
                duration = duration,
                address = address,
                notes = notes,
                totalPrice = 0f // Will be calculated by server
            )
            val response = api.createBooking(request)
            response.booking.toBooking()?.let {
                Result.success(it)
            } ?: Result.failure(Exception("Invalid booking data"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun cancelBooking(bookingId: String): Result<Unit> {
        return try {
            api.cancelBooking(bookingId, CancelBookingRequest(null))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun BookingApiModel.toBooking(): Booking? {
        return try {
            Booking(
                id = id,
                status = BookingStatus.valueOf(status),
                scheduledDate = LocalDate.parse(scheduledDate),
                scheduledTime = LocalTime.parse(scheduledTime),
                duration = duration,
                totalPrice = Price(totalPrice.toDouble(), currency),
                address = address,
                worker = cleaner ?: return null,
                service = service ?: return null,
                notes = notes,
                review = review
            )
        } catch (e: Exception) {
            null
        }
    }
}

// ==================== Service Repository ====================
interface ServiceRepository {
    suspend fun getServices(): Result<List<Service>>
}

class ServiceRepositoryImpl @Inject constructor(
    private val api: ServantanaApi
) : ServiceRepository {

    override suspend fun getServices(): Result<List<Service>> {
        return try {
            // Mock services for now
            Result.success(listOf(
                Service("1", "Standard Cleaning", "Regular home cleaning service", 50f, 2),
                Service("2", "Deep Cleaning", "Thorough deep cleaning", 100f, 4),
                Service("3", "Move-out Cleaning", "Complete move-out cleaning service", 150f, 5),
                Service("4", "Office Cleaning", "Professional office cleaning", 80f, 3)
            ))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ==================== Review Repository ====================
interface ReviewRepository {
    suspend fun getReviews(workerId: String): Result<List<Review>>
    suspend fun createReview(bookingId: String, rating: Int, comment: String?): Result<Review>
}

class ReviewRepositoryImpl @Inject constructor(
    private val api: ServantanaApi
) : ReviewRepository {

    override suspend fun getReviews(workerId: String): Result<List<Review>> {
        return try {
            val response = api.getWorkerReviews(workerId)
            Result.success(response.reviews)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun createReview(bookingId: String, rating: Int, comment: String?): Result<Review> {
        return try {
            val request = CreateReviewRequest(bookingId, rating, comment)
            val response = api.createReview(request)
            Result.success(response.review)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ==================== Message Repository ====================
interface MessageRepository {
    suspend fun getConversations(): Result<List<Conversation>>
    suspend fun getMessages(userId: String): Result<List<Message>>
    suspend fun sendMessage(receiverId: String, content: String): Result<Message>
}

class MessageRepositoryImpl @Inject constructor(
    private val api: ServantanaApi
) : MessageRepository {

    override suspend fun getConversations(): Result<List<Conversation>> {
        return try {
            val response = api.getConversations()
            Result.success(response.conversations)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getMessages(userId: String): Result<List<Message>> {
        return try {
            val response = api.getMessages(userId, 100)
            Result.success(response.messages)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun sendMessage(receiverId: String, content: String): Result<Message> {
        return try {
            val response = api.sendMessage(SendMessageRequest(receiverId, content, null))
            Result.success(response.message)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ==================== AI Repository ====================
interface AIRepository {
    suspend fun chat(message: String, history: List<AIChatMessage>): Result<AIChatResponse>
    suspend fun smartMatch(
        categoryId: String?,
        latitude: Double,
        longitude: Double,
        maxDistance: Double
    ): Result<List<SmartMatchResult>>
    suspend fun smartSchedule(date: String, categoryId: String): Result<SmartScheduleResponse>
    suspend fun analyzePhotos(imageUrls: List<String>, analysisType: String): Result<PhotoAnalysisResponse>
    suspend fun estimatePrice(
        imageUrls: List<String>,
        serviceType: String,
        professionId: String? = null,
        additionalInfo: String? = null,
        currency: String = "USD"
    ): Result<PriceEstimateResponse>
    suspend fun optimizeRoute(
        date: String,
        bookingIds: List<String>? = null,
        startLatitude: Double? = null,
        startLongitude: Double? = null
    ): Result<RouteOptimizeResponse>
}

class AIRepositoryImpl @Inject constructor(
    private val api: ServantanaApi
) : AIRepository {

    override suspend fun chat(message: String, history: List<AIChatMessage>): Result<AIChatResponse> {
        return try {
            val chatHistory = history.map { ChatMessage(it.role, it.content) }
            val response = api.aiChat(AIChatRequest(message, chatHistory))
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun smartMatch(
        categoryId: String?,
        latitude: Double,
        longitude: Double,
        maxDistance: Double
    ): Result<List<SmartMatchResult>> {
        return try {
            val request = SmartMatchRequest(
                categoryId = categoryId,
                latitude = latitude,
                longitude = longitude,
                maxDistance = maxDistance.toInt()
            )
            val response = api.smartMatch(request)
            Result.success(response.matches)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun smartSchedule(date: String, categoryId: String): Result<SmartScheduleResponse> {
        return try {
            val request = SmartScheduleRequest(date = date, professionId = categoryId)
            val response = api.smartSchedule(request)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun analyzePhotos(imageUrls: List<String>, analysisType: String): Result<PhotoAnalysisResponse> {
        return try {
            val request = PhotoAnalysisRequest(imageUrls = imageUrls, analysisType = analysisType)
            val response = api.analyzePhoto(request)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun estimatePrice(
        imageUrls: List<String>,
        serviceType: String,
        professionId: String?,
        additionalInfo: String?,
        currency: String
    ): Result<PriceEstimateResponse> {
        return try {
            val request = PriceEstimateRequest(
                imageUrls = imageUrls,
                serviceType = serviceType,
                professionId = professionId,
                additionalInfo = additionalInfo,
                userCurrency = currency
            )
            val response = api.estimatePrice(request)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun optimizeRoute(
        date: String,
        bookingIds: List<String>?,
        startLatitude: Double?,
        startLongitude: Double?
    ): Result<RouteOptimizeResponse> {
        return try {
            val startLocation = if (startLatitude != null && startLongitude != null) {
                Location(startLatitude, startLongitude)
            } else null
            val request = RouteOptimizeRequest(
                date = date,
                bookingIds = bookingIds,
                startLocation = startLocation
            )
            val response = api.optimizeRoute(request)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

// ==================== User Repository ====================
interface UserRepository {
    suspend fun getCurrentUser(): User
    suspend fun updateProfile(request: UpdateProfileRequest): User
}

class UserRepositoryImpl @Inject constructor(
    private val api: ServantanaApi
) : UserRepository {

    override suspend fun getCurrentUser(): User {
        val response = api.getCurrentUser()
        return response.user
    }

    override suspend fun updateProfile(request: UpdateProfileRequest): User {
        val response = api.updateProfile(request)
        return response.user
    }
}

// ==================== Favorites Repository ====================
interface FavoritesRepository {
    suspend fun getFavorites(): List<Worker>
    suspend fun addFavorite(workerId: String)
    suspend fun removeFavorite(workerId: String)
}

class FavoritesRepositoryImpl @Inject constructor(
    private val api: ServantanaApi
) : FavoritesRepository {

    override suspend fun getFavorites(): List<Worker> {
        val response = api.getFavorites()
        return response.favorites.map { it.cleaner }
    }

    override suspend fun addFavorite(workerId: String) {
        api.addFavorite(AddFavoriteRequest(workerId))
    }

    override suspend fun removeFavorite(workerId: String) {
        api.removeFavorite(workerId)
    }
}

// ==================== Location Repository ====================
interface LocationRepository {
    suspend fun updateUserLocation(
        latitude: Double,
        longitude: Double,
        city: String? = null,
        country: String? = null
    ): Result<LocationUpdateResponse>

    suspend fun getUserLocation(): Result<UserLocationResponse>

    suspend fun updateWorkerLocation(
        latitude: Double,
        longitude: Double
    ): Result<WorkerLocationUpdateResponse>

    suspend fun getWorkerLocation(): Result<WorkerLocationResponse>

    suspend fun updateBookingETA(
        bookingId: String,
        status: String,
        latitude: Double? = null,
        longitude: Double? = null,
        estimatedArrival: String? = null
    ): Result<BookingETAUpdateResponse>

    suspend fun getBookingETA(bookingId: String): Result<BookingETAResponse>
}

class LocationRepositoryImpl @Inject constructor(
    private val api: ServantanaApi
) : LocationRepository {

    override suspend fun updateUserLocation(
        latitude: Double,
        longitude: Double,
        city: String?,
        country: String?
    ): Result<LocationUpdateResponse> {
        return try {
            val response = api.updateUserLocation(
                UpdateLocationRequest(latitude, longitude, city, country)
            )
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getUserLocation(): Result<UserLocationResponse> {
        return try {
            val response = api.getUserLocation()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateWorkerLocation(
        latitude: Double,
        longitude: Double
    ): Result<WorkerLocationUpdateResponse> {
        return try {
            val response = api.updateWorkerLocation(
                WorkerLocationUpdateRequest(latitude, longitude)
            )
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getWorkerLocation(): Result<WorkerLocationResponse> {
        return try {
            val response = api.getWorkerLocation()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateBookingETA(
        bookingId: String,
        status: String,
        latitude: Double?,
        longitude: Double?,
        estimatedArrival: String?
    ): Result<BookingETAUpdateResponse> {
        return try {
            val response = api.updateBookingETA(
                bookingId,
                UpdateETARequest(status, latitude, longitude, estimatedArrival)
            )
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getBookingETA(bookingId: String): Result<BookingETAResponse> {
        return try {
            val response = api.getBookingETA(bookingId)
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
