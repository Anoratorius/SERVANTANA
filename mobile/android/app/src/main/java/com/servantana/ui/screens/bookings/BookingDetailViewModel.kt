package com.servantana.ui.screens.bookings

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.Booking
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BookingDetailUiState(
    val isLoading: Boolean = true,
    val booking: Booking? = null,
    val isCancelling: Boolean = false,
    val error: String? = null,
    val cancellationSuccess: Boolean = false
)

@HiltViewModel
class BookingDetailViewModel @Inject constructor(
    private val api: ServantanaApi,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val bookingId: String = checkNotNull(savedStateHandle["bookingId"])

    private val _uiState = MutableStateFlow(BookingDetailUiState())
    val uiState: StateFlow<BookingDetailUiState> = _uiState.asStateFlow()

    init {
        loadBooking()
    }

    fun loadBooking() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val response = api.getBooking(bookingId)

                if (response.isSuccessful) {
                    _uiState.update {
                        it.copy(isLoading = false, booking = response.body()?.booking)
                    }
                } else {
                    _uiState.update {
                        it.copy(isLoading = false, error = "Failed to load booking details")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Failed to load booking")
                }
            }
        }
    }

    fun cancelBooking(reason: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isCancelling = true, error = null) }

            try {
                val response = api.cancelBooking(
                    id = bookingId,
                    reason = reason?.let { mapOf("reason" to it) }
                )

                if (response.isSuccessful) {
                    _uiState.update {
                        it.copy(isCancelling = false, cancellationSuccess = true)
                    }
                } else {
                    _uiState.update {
                        it.copy(isCancelling = false, error = "Failed to cancel booking")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isCancelling = false, error = e.message ?: "Cancellation failed")
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
