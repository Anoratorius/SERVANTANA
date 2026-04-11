package com.servantana.app.ui.screens.worker

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Booking
import com.servantana.app.data.repository.BookingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

data class WorkerDashboardUiState(
    val todayBookings: List<Booking> = emptyList(),
    val upcomingBookings: List<Booking> = emptyList(),
    val pendingRequests: Int = 0,
    val todayEarnings: Double = 0.0,
    val weeklyEarnings: Double = 0.0,
    val completedToday: Int = 0,
    val averageRating: Double = 0.0,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class WorkerDashboardViewModel @Inject constructor(
    private val bookingRepository: BookingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkerDashboardUiState())
    val uiState: StateFlow<WorkerDashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
    }

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val bookingsResult = bookingRepository.getMyBookings()
                bookingsResult.onSuccess { bookings ->
                    val today = LocalDate.now()
                    val todayBookings = bookings.filter { it.scheduledDate == today }
                    val upcomingBookings = bookings.filter { it.scheduledDate.isAfter(today) }
                        .sortedBy { it.scheduledDate }
                        .take(5)
                    val pendingRequests = bookings.count {
                        it.status == com.servantana.app.data.model.BookingStatus.PENDING
                    }
                    val completedToday = todayBookings.count {
                        it.status == com.servantana.app.data.model.BookingStatus.COMPLETED
                    }
                    val todayEarnings = todayBookings
                        .filter { it.status == com.servantana.app.data.model.BookingStatus.COMPLETED }
                        .sumOf { it.totalPrice.amount }

                    _uiState.value = _uiState.value.copy(
                        todayBookings = todayBookings,
                        upcomingBookings = upcomingBookings,
                        pendingRequests = pendingRequests,
                        todayEarnings = todayEarnings,
                        completedToday = completedToday,
                        isLoading = false
                    )
                }.onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message ?: "Failed to load dashboard"
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load dashboard"
                )
            }
        }
    }

    fun refresh() {
        loadDashboard()
    }
}
