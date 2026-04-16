package com.servantana.app.navigation

import kotlinx.serialization.Serializable

// Auth Routes
@Serializable
object Login

@Serializable
object SignUp

@Serializable
object ForgotPassword

// Main Routes
@Serializable
object Home

@Serializable
object Search

@Serializable
data class WorkerProfile(val workerId: String)

@Serializable
object Bookings

@Serializable
data class BookingDetail(val bookingId: String)

@Serializable
data class CreateBooking(val workerId: String)

@Serializable
data class Payment(val bookingId: String)

@Serializable
object Messages

@Serializable
data class Chat(val userId: String)

@Serializable
object Profile

@Serializable
object EditProfile

@Serializable
object Favorites

@Serializable
object Properties

@Serializable
data class PropertyDetail(val propertyId: String)

@Serializable
object Invoices

// AI Routes
@Serializable
object AIAssistant

@Serializable
data class SmartMatch(
    val latitude: Double,
    val longitude: Double,
    val professionId: String? = null,
    val categoryId: String? = null
)

@Serializable
data class SmartSchedule(
    val workerId: String? = null,
    val professionId: String? = null
)

@Serializable
data class ReviewInsights(val workerId: String)

@Serializable
data class ReviewSubmission(val bookingId: String)

@Serializable
object PhotoAnalysis

@Serializable
object PriceEstimate

// Worker Routes (for worker role)
@Serializable
object WorkerDashboard

@Serializable
object WorkerEarnings

@Serializable
object WorkerAvailability

@Serializable
object WorkerAnalytics

@Serializable
object RouteOptimizer

// Settings
@Serializable
object Settings

@Serializable
object NotificationSettings

@Serializable
object SecuritySettings

// Worker Onboarding
@Serializable
object WorkerOnboarding

@Serializable
object WorkerOnboardingProfile

@Serializable
object WorkerOnboardingProfessions

@Serializable
object WorkerOnboardingAvailability

@Serializable
object WorkerOnboardingDocuments

@Serializable
object WorkerOnboardingStripe

@Serializable
object WorkerOnboardingGoLive
