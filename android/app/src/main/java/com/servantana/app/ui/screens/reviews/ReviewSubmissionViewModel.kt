package com.servantana.app.ui.screens.reviews

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Booking
import com.servantana.app.data.repository.BookingRepository
import com.servantana.app.data.repository.ReviewRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ReviewSubmissionUiState(
    val isLoadingBooking: Boolean = true,
    val booking: Booking? = null,
    val rating: Int = 5,
    val comment: String = "",
    val isSubmitting: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
) {
    val workerName: String
        get() = booking?.worker?.let { "${it.firstName} ${it.lastName}" } ?: ""

    val serviceName: String
        get() = booking?.service?.name ?: "Service"

    val isFormValid: Boolean
        get() = rating in 1..5
}

@HiltViewModel
class ReviewSubmissionViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
    private val reviewRepository: ReviewRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val bookingId: String = checkNotNull(savedStateHandle["bookingId"])

    private val _uiState = MutableStateFlow(ReviewSubmissionUiState())
    val uiState: StateFlow<ReviewSubmissionUiState> = _uiState.asStateFlow()

    init {
        loadBooking()
    }

    private fun loadBooking() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingBooking = true, error = null) }

            bookingRepository.getBooking(bookingId)
                .onSuccess { booking ->
                    _uiState.update { it.copy(isLoadingBooking = false, booking = booking) }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoadingBooking = false,
                            error = error.message ?: "Failed to load booking"
                        )
                    }
                }
        }
    }

    fun setRating(rating: Int) {
        _uiState.update { it.copy(rating = rating.coerceIn(1, 5)) }
    }

    fun setComment(comment: String) {
        _uiState.update { it.copy(comment = comment.take(500)) }
    }

    fun submitReview() {
        val state = _uiState.value

        if (!state.isFormValid) {
            _uiState.update { it.copy(error = "Please select a rating") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            reviewRepository.createReview(
                bookingId = bookingId,
                rating = state.rating,
                comment = state.comment.ifBlank { null }
            )
                .onSuccess {
                    _uiState.update { it.copy(isSubmitting = false, isSuccess = true) }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = error.message ?: "Failed to submit review"
                        )
                    }
                }
        }
    }
}
