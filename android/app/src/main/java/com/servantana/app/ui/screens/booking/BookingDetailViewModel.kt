package com.servantana.app.ui.screens.booking

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Booking
import com.servantana.app.data.model.BookingStatus
import com.servantana.app.data.repository.BookingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BookingDetailUiState(
    val isLoading: Boolean = false,
    val booking: Booking? = null,
    val error: String? = null,
    val actionInProgress: Boolean = false
)

@HiltViewModel
class BookingDetailViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val bookingId: String = checkNotNull(savedStateHandle["bookingId"])

    private val _uiState = MutableStateFlow(BookingDetailUiState())
    val uiState: StateFlow<BookingDetailUiState> = _uiState.asStateFlow()

    init {
        loadBooking()
    }

    private fun loadBooking() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            bookingRepository.getBooking(bookingId)
                .onSuccess { booking ->
                    _uiState.update { it.copy(isLoading = false, booking = booking) }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Failed to load booking"
                        )
                    }
                }
        }
    }

    fun cancelBooking() {
        viewModelScope.launch {
            _uiState.update { it.copy(actionInProgress = true) }

            bookingRepository.cancelBooking(bookingId)
                .onSuccess {
                    loadBooking()
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            actionInProgress = false,
                            error = exception.message ?: "Failed to cancel booking"
                        )
                    }
                }
        }
    }

    fun refresh() {
        loadBooking()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
