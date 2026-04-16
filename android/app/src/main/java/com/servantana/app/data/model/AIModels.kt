package com.servantana.app.data.model

import kotlinx.serialization.Serializable

// ==================== AI Chat ====================
@Serializable
data class AIChatRequest(
    val message: String,
    val conversationHistory: List<ChatMessage> = emptyList()
)

@Serializable
data class ChatMessage(
    val role: String, // "user" or "assistant"
    val content: String
)

@Serializable
data class AIChatResponse(
    val message: String,
    val suggestedActions: List<SuggestedAction> = emptyList(),
    val usage: TokenUsage? = null
)

@Serializable
data class SuggestedAction(
    val label: String,
    val action: String,
    val url: String? = null
)

@Serializable
data class TokenUsage(
    val inputTokens: Int,
    val outputTokens: Int
)

// UI-friendly chat message with additional metadata
data class AIChatMessage(
    val id: String,
    val role: String, // "user" or "assistant"
    val content: String,
    val timestamp: Long = System.currentTimeMillis()
)

// ==================== Smart Match ====================
@Serializable
data class SmartMatchRequest(
    val latitude: Double,
    val longitude: Double,
    val professionId: String? = null,
    val categoryId: String? = null,
    val preferredDate: String? = null,
    val preferredTime: String? = null,
    val maxPrice: Float? = null,
    val ecoFriendly: Boolean? = null,
    val petFriendly: Boolean? = null,
    val limit: Int = 10
)

@Serializable
data class SmartMatchResponse(
    val matches: List<WorkerMatch>,
    val totalCandidates: Int,
    val scoringWeights: Map<String, Float>? = null
)

@Serializable
data class WorkerMatch(
    val worker: Worker,
    val matchScore: Int,
    val matchPercentage: Int,
    val factors: MatchFactors,
    val matchReasons: List<String>
)

@Serializable
data class MatchFactors(
    val rating: Float = 0f,
    val experience: Float = 0f,
    val distance: Float = 0f,
    val price: Float = 0f,
    val availability: Float = 0f,
    val preferences: Float = 0f,
    val reliability: Float = 0f,
    val verification: Float = 0f,
    val responseTime: Float = 0f,
    val repeatCustomer: Float = 0f
)

// UI-friendly wrapper for smart match results
typealias SmartMatchResult = WorkerMatch

// Extension properties for UI compatibility
val SmartMatchResult.score: Int get() = matchPercentage
val SmartMatchResult.breakdown: Map<String, Double> get() = mapOf(
    "rating" to (factors.rating * 100).toDouble(),
    "experience" to (factors.experience * 100).toDouble(),
    "distance" to (factors.distance * 100).toDouble(),
    "price" to (factors.price * 100).toDouble(),
    "availability" to (factors.availability * 100).toDouble(),
    "preferences" to (factors.preferences * 100).toDouble(),
    "reliability" to (factors.reliability * 100).toDouble(),
    "verification" to (factors.verification * 100).toDouble(),
    "responseTime" to (factors.responseTime * 100).toDouble(),
    "repeatCustomer" to (factors.repeatCustomer * 100).toDouble()
)

// ==================== Smart Schedule ====================
@Serializable
data class SmartScheduleRequest(
    val workerId: String? = null,
    val professionId: String? = null,
    val categoryId: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val duration: Int = 120,
    val startDate: String? = null,
    val daysAhead: Int = 14
)

@Serializable
data class SmartScheduleResponse(
    val suggestions: List<TimeSlotSuggestion>,
    val categories: ScheduleCategories,
    val demandForecast: List<DemandPoint> = emptyList(),
    val totalSlotsAnalyzed: Int
)

@Serializable
data class TimeSlotSuggestion(
    val date: String,
    val time: String,
    val dayName: String,
    val score: Int,
    val priceModifier: Float,
    val demandLevel: String, // "low", "medium", "high", "peak"
    val reasons: List<String>,
    val estimatedWaitTime: Int,
    val availableWorkers: Int
)

@Serializable
data class ScheduleCategories(
    val bestValue: List<TimeSlotSuggestion> = emptyList(),
    val quickestConfirmation: List<TimeSlotSuggestion> = emptyList(),
    val mostAvailable: List<TimeSlotSuggestion> = emptyList()
)

@Serializable
data class DemandPoint(
    val dayOfWeek: Int,
    val hour: Int,
    val demand: Int
)

// ==================== Review Insights ====================
@Serializable
data class ReviewInsightsRequest(
    val workerId: String,
    val reviewIds: List<String>? = null,
    val analyzeAll: Boolean = true
)

@Serializable
data class ReviewInsightsResponse(
    val insights: ReviewInsights?,
    val stats: ReviewStats,
    val recentReviews: List<RecentReview> = emptyList()
)

@Serializable
data class ReviewInsights(
    val sentiment: SentimentAnalysis,
    val themes: List<ReviewTheme> = emptyList(),
    val strengths: List<String> = emptyList(),
    val weaknesses: List<String> = emptyList(),
    val trustScore: Int,
    val trustFactors: TrustFactors,
    val summary: String,
    val recommendations: List<String> = emptyList()
)

@Serializable
data class SentimentAnalysis(
    val overall: String, // "positive", "neutral", "negative"
    val score: Int, // -100 to 100
    val confidence: Int // 0-100
)

@Serializable
data class ReviewTheme(
    val theme: String,
    val sentiment: String,
    val mentions: Int,
    val examples: List<String> = emptyList()
)

@Serializable
data class TrustFactors(
    val authenticityScore: Int,
    val consistencyScore: Int,
    val detailScore: Int,
    val recencyScore: Int
)

@Serializable
data class ReviewStats(
    val totalReviews: Int,
    val averageRating: Float,
    val ratingsDistribution: List<Int>,
    val reviewsWithComments: Int,
    val avgReviewerAccountAge: Int,
    val avgReviewerBookings: Float
)

@Serializable
data class RecentReview(
    val id: String,
    val rating: Int,
    val comment: String?,
    val date: String,
    val reviewerName: String
)

// ==================== Photo Analysis ====================
@Serializable
data class PhotoAnalysisRequest(
    val imageUrls: List<String>,
    val analysisType: String = "single", // "single" or "before_after"
    val bookingId: String? = null
)

@Serializable
data class PhotoAnalysisResponse(
    val type: String,
    val photos: List<PhotoAnalysis>? = null,
    val comparison: BeforeAfterComparison? = null,
    val summary: PhotoSummary? = null,
    val bookingId: String? = null
)

@Serializable
data class PhotoAnalysis(
    val cleanlinessScore: Int,
    val overallCondition: String,
    val areasOfConcern: List<String>,
    val positiveAspects: List<String>,
    val jobComplexity: String,
    val estimatedTime: Int,
    val recommendations: List<String>,
    val confidence: Int
)

@Serializable
data class BeforeAfterComparison(
    val improvementScore: Int,
    val beforeScore: Int,
    val afterScore: Int,
    val improvements: List<String>,
    val remainingIssues: List<String>,
    val qualityVerified: Boolean,
    val verificationNotes: String
)

@Serializable
data class PhotoSummary(
    val averageCleanlinessScore: Float,
    val overallCondition: String,
    val allConcerns: List<String>,
    val allPositives: List<String>,
    val averageJobComplexity: String,
    val totalEstimatedTime: Int,
    val averageConfidence: Int
)

// ==================== Price Estimate ====================
@Serializable
data class PriceEstimateRequest(
    val imageUrls: List<String>,
    val serviceType: String = "cleaning",
    val professionId: String? = null,
    val additionalInfo: String? = null,
    val userCurrency: String = "USD"
)

@Serializable
data class PriceEstimateResponse(
    val estimate: PriceEstimate,
    val marketData: MarketData,
    val comparableBookings: List<ComparableBooking> = emptyList()
)

@Serializable
data class PriceEstimate(
    val estimatedPrice: PriceRange,
    val breakdown: PriceBreakdown,
    val spaceAnalysis: SpaceAnalysis,
    val timeEstimate: TimeEstimate,
    val specialRequirements: List<String>,
    val confidence: Int,
    val notes: String
)

@Serializable
data class PriceRange(
    val low: Int,
    val mid: Int,
    val high: Int,
    val currency: String
)

@Serializable
data class PriceBreakdown(
    val basePrice: Int,
    val sizeMultiplier: Float,
    val difficultyMultiplier: Float,
    val specialtyAddons: Int
)

@Serializable
data class SpaceAnalysis(
    val estimatedSqMeters: Int,
    val roomCount: Int,
    val roomTypes: List<String>,
    val condition: String,
    val difficulty: Int
)

@Serializable
data class TimeEstimate(
    val minMinutes: Int,
    val maxMinutes: Int,
    val recommended: Int
)

@Serializable
data class MarketData(
    val avgHourlyRate: Int,
    val rateRange: RateRange,
    val currency: String
)

@Serializable
data class RateRange(
    val min: Int,
    val max: Int
)

@Serializable
data class ComparableBooking(
    val price: Float,
    val duration: Int,
    val service: String?
)

// ==================== Route Optimize ====================
@Serializable
data class RouteOptimizeRequest(
    val date: String,
    val bookingIds: List<String>? = null,
    val startLocation: Location? = null
)

@Serializable
data class Location(
    val latitude: Double,
    val longitude: Double
)

@Serializable
data class RouteOptimizeResponse(
    val route: OptimizedRoute,
    val metadata: RouteMetadata
)

@Serializable
data class OptimizedRoute(
    val originalOrder: List<RouteLocation>,
    val optimizedOrder: List<RouteLocation>,
    val savings: RouteSavings,
    val totalDistance: Float,
    val totalDuration: Int,
    val legs: List<RouteLeg>,
    val schedule: List<ScheduleEntry>
)

@Serializable
data class RouteLocation(
    val id: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val scheduledTime: String,
    val duration: Int,
    val address: String? = null
)

@Serializable
data class RouteSavings(
    val distanceKm: Float,
    val estimatedMinutes: Int,
    val percentImprovement: Int
)

@Serializable
data class RouteLeg(
    val from: String,
    val to: String,
    val distanceKm: Float,
    val estimatedMinutes: Int
)

@Serializable
data class ScheduleEntry(
    val bookingId: String,
    val arrivalTime: String,
    val departureTime: String,
    val address: String
)

@Serializable
data class RouteMetadata(
    val bookingsOptimized: Int,
    val date: String,
    val startLocation: Location?
)
