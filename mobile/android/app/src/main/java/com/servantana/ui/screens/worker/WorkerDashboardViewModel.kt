package com.servantana.ui.screens.worker

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.Booking
import com.servantana.data.model.WorkerProfile
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WorkerDashboardUiState(
    val isLoading: Boolean = true,
    val profile: WorkerProfile? = null,
    val pendingBookings: List<Booking> = emptyList(),
    val todayBookings: List<Booking> = emptyList(),
    val earnings: Map<String, Any> = emptyMap(),
    val error: String? = null,
    val isUpdatingStatus: Boolean = false
)

@HiltViewModel
class WorkerDashboardViewModel @Inject constructor(
    private val api: ServantanaApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(WorkerDashboardUiState())
    val uiState: StateFlow<WorkerDashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
    }

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // Load profile
            launch {
                try {
                    val response = api.getWorkerProfile()
                    if (response.isSuccessful) {
                        _uiState.update { it.copy(profile = response.body()) }
                    }
                } catch (e: Exception) {
                    // Profile failed to load
                }
            }

            // Load bookings
            launch {
                try {
                    val response = api.getBookings()
                    if (response.isSuccessful) {
                        val bookings = response.body()?.bookings ?: emptyList()

                        val pending = bookings.filter { it.status == "PENDING" }
                        val today = bookings.filter {
                            it.status in listOf("CONFIRMED", "IN_PROGRESS") &&
                                    isToday(it.scheduledDate)
                        }

                        _uiState.update {
                            it.copy(
                                pendingBookings = pending,
                                todayBookings = today
                            )
                        }
                    }
                } catch (e: Exception) {
                    // Bookings failed to load
                }
            }

            // Load earnings
            launch {
                try {
                    val response = api.getWorkerEarnings()
                    if (response.isSuccessful) {
                        _uiState.update { it.copy(earnings = response.body() ?: emptyMap()) }
                    }
                } catch (e: Exception) {
                    // Earnings failed to load
                }
            }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun acceptBooking(bookingId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingStatus = true) }

            try {
                val response = api.updateBookingStatus(
                    id = bookingId,
                    status = mapOf("status" to "CONFIRMED")
                )

                if (response.isSuccessful) {
                    loadDashboard() // Refresh
                } else {
                    _uiState.update {
                        it.copy(isUpdatingStatus = false, error = "Failed to accept booking")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isUpdatingStatus = false, error = e.message)
                }
            }
        }
    }

    fun declineBooking(bookingId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingStatus = true) }

            try {
                val response = api.cancelBooking(
                    id = bookingId,
                    reason = mapOf("reason" to "Worker declined")
                )

                if (response.isSuccessful) {
                    loadDashboard() // Refresh
                } else {
                    _uiState.update {
                        it.copy(isUpdatingStatus = false, error = "Failed to decline booking")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isUpdatingStatus = false, error = e.message)
                }
            }
        }
    }

    fun startJob(bookingId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingStatus = true) }

            try {
                val response = api.updateBookingStatus(
                    id = bookingId,
                    status = mapOf("status" to "IN_PROGRESS")
                )

                if (response.isSuccessful) {
                    loadDashboard()
                } else {
                    _uiState.update {
                        it.copy(isUpdatingStatus = false, error = "Failed to start job")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isUpdatingStatus = false, error = e.message)
                }
            }
        }
    }

    fun completeJob(bookingId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUpdatingStatus = true) }

            try {
                val response = api.updateBookingStatus(
                    id = bookingId,
                    status = mapOf("status" to "COMPLETED")
                )

                if (response.isSuccessful) {
                    loadDashboard()
                } else {
                    _uiState.update {
                        it.copy(isUpdatingStatus = false, error = "Failed to complete job")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isUpdatingStatus = false, error = e.message)
                }
            }
        }
    }

    fun refresh() {
        loadDashboard()
    }

    private fun isToday(dateString: String): Boolean {
        return try {
            val today = java.time.LocalDate.now().toString()
            dateString == today
        } catch (e: Exception) {
            false
        }
    }
}
