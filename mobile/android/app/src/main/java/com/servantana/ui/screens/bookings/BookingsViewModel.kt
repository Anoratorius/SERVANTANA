package com.servantana.ui.screens.bookings

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

enum class BookingTab {
    UPCOMING, PAST
}

data class BookingsUiState(
    val isLoading: Boolean = true,
    val selectedTab: BookingTab = BookingTab.UPCOMING,
    val upcomingBookings: List<Booking> = emptyList(),
    val pastBookings: List<Booking> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class BookingsViewModel @Inject constructor(
    private val api: ServantanaApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(BookingsUiState())
    val uiState: StateFlow<BookingsUiState> = _uiState.asStateFlow()

    init {
        loadBookings()
    }

    fun loadBookings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Load all bookings
                val response = api.getBookings()

                if (response.isSuccessful) {
                    val allBookings = response.body()?.bookings ?: emptyList()

                    val upcoming = allBookings.filter { booking ->
                        booking.status in listOf("PENDING", "CONFIRMED", "IN_PROGRESS")
                    }.sortedBy { it.scheduledDate }

                    val past = allBookings.filter { booking ->
                        booking.status in listOf("COMPLETED", "CANCELLED")
                    }.sortedByDescending { it.scheduledDate }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            upcomingBookings = upcoming,
                            pastBookings = past
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(isLoading = false, error = "Failed to load bookings")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Failed to load bookings")
                }
            }
        }
    }

    fun selectTab(tab: BookingTab) {
        _uiState.update { it.copy(selectedTab = tab) }
    }

    fun refresh() {
        loadBookings()
    }
}
