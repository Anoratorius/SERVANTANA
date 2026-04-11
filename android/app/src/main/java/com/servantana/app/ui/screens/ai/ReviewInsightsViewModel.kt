package com.servantana.app.ui.screens.ai

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Review
import com.servantana.app.data.repository.ReviewRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReviewInsight(
    val category: String,
    val sentiment: String,
    val score: Float,
    val mentions: Int,
    val keywords: List<String>
)

data class ReviewInsightsUiState(
    val workerId: String = "",
    val workerName: String = "",
    val reviews: List<Review> = emptyList(),
    val overallSentiment: String = "Positive",
    val overallScore: Float = 0f,
    val trustScore: Float = 0f,
    val insights: List<ReviewInsight> = emptyList(),
    val strengths: List<String> = emptyList(),
    val areasForImprovement: List<String> = emptyList(),
    val isLoading: Boolean = false,
    val isAnalyzing: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ReviewInsightsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val reviewRepository: ReviewRepository
) : ViewModel() {

    private val workerId: String = savedStateHandle["workerId"] ?: ""

    private val _uiState = MutableStateFlow(ReviewInsightsUiState(workerId = workerId))
    val uiState: StateFlow<ReviewInsightsUiState> = _uiState.asStateFlow()

    init {
        loadReviews()
    }

    private fun loadReviews() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val result = reviewRepository.getReviews(workerId)
                result.onSuccess { reviews ->
                    _uiState.value = _uiState.value.copy(
                        reviews = reviews,
                        isLoading = false
                    )
                    analyzeReviews()
                }.onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load reviews"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load reviews"
                )
            }
        }
    }

    private fun analyzeReviews() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isAnalyzing = true)
            try {
                // Mock AI analysis - would call /api/ai/reviews endpoint
                val reviews = _uiState.value.reviews
                val avgRating = if (reviews.isNotEmpty()) {
                    reviews.map { it.rating }.average().toFloat()
                } else 0f

                val insights = listOf(
                    ReviewInsight(
                        category = "Punctuality",
                        sentiment = "Positive",
                        score = 0.92f,
                        mentions = 15,
                        keywords = listOf("on time", "punctual", "reliable")
                    ),
                    ReviewInsight(
                        category = "Quality",
                        sentiment = "Positive",
                        score = 0.88f,
                        mentions = 22,
                        keywords = listOf("thorough", "clean", "spotless")
                    ),
                    ReviewInsight(
                        category = "Communication",
                        sentiment = "Positive",
                        score = 0.85f,
                        mentions = 12,
                        keywords = listOf("friendly", "responsive", "professional")
                    ),
                    ReviewInsight(
                        category = "Value",
                        sentiment = "Neutral",
                        score = 0.72f,
                        mentions = 8,
                        keywords = listOf("fair price", "worth it")
                    )
                )

                _uiState.value = _uiState.value.copy(
                    overallSentiment = if (avgRating >= 4) "Positive" else if (avgRating >= 3) "Neutral" else "Negative",
                    overallScore = avgRating / 5f,
                    trustScore = 0.89f,
                    insights = insights,
                    strengths = listOf(
                        "Consistently arrives on time",
                        "Excellent attention to detail",
                        "Great communication skills"
                    ),
                    areasForImprovement = listOf(
                        "Could offer more flexible scheduling"
                    ),
                    isAnalyzing = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isAnalyzing = false,
                    error = e.message
                )
            }
        }
    }

    fun refresh() {
        loadReviews()
    }
}
