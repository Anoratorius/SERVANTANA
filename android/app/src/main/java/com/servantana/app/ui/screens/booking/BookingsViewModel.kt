package com.servantana.app.ui.screens.booking

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

data class BookingsUiState(
    val isLoading: Boolean = false,
    val upcomingBookings: List<Booking> = emptyList(),
    val pastBookings: List<Booking> = emptyList(),
    val selectedTab: Int = 0,
    val error: String? = null
)

@HiltViewModel
class BookingsViewModel @Inject constructor(
    private val bookingRepository: BookingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(BookingsUiState())
    val uiState: StateFlow<BookingsUiState> = _uiState.asStateFlow()

    init {
        loadBookings()
    }

    fun loadBookings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            bookingRepository.getMyBookings()
                .onSuccess { bookings ->
                    val upcoming = bookings.filter { booking ->
                        booking.status in listOf(
                            BookingStatus.PENDING,
                            BookingStatus.CONFIRMED,
                            BookingStatus.IN_PROGRESS
                        )
                    }.sortedBy { it.scheduledDate }

                    val past = bookings.filter { booking ->
                        booking.status in listOf(
                            BookingStatus.COMPLETED,
                            BookingStatus.CANCELLED
                        )
                    }.sortedByDescending { it.scheduledDate }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            upcomingBookings = upcoming,
                            pastBookings = past
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Failed to load bookings"
                        )
                    }
                }
        }
    }

    fun setTab(index: Int) {
        _uiState.update { it.copy(selectedTab = index) }
    }

    fun cancelBooking(bookingId: String) {
        viewModelScope.launch {
            bookingRepository.cancelBooking(bookingId)
                .onSuccess {
                    loadBookings()
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(error = exception.message ?: "Failed to cancel booking")
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
