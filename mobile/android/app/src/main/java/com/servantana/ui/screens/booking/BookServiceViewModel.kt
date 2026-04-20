package com.servantana.ui.screens.booking

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.CreateBookingRequest
import com.servantana.data.model.Service
import com.servantana.data.model.Worker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BookServiceUiState(
    val isLoading: Boolean = true,
    val worker: Worker? = null,
    val availableSlots: List<String> = emptyList(),
    val selectedService: Service? = null,
    val selectedDate: String = "",
    val selectedTime: String = "",
    val duration: Int = 2,
    val address: String = "",
    val city: String = "",
    val notes: String = "",
    val isBooking: Boolean = false,
    val bookingSuccess: Boolean = false,
    val newBookingId: String? = null,
    val error: String? = null
)

@HiltViewModel
class BookServiceViewModel @Inject constructor(
    private val api: ServantanaApi,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val workerId: String = checkNotNull(savedStateHandle["workerId"])

    private val _uiState = MutableStateFlow(BookServiceUiState())
    val uiState: StateFlow<BookServiceUiState> = _uiState.asStateFlow()

    init {
        loadWorker()
    }

    private fun loadWorker() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val response = api.getWorker(workerId)

                if (response.isSuccessful) {
                    val worker = response.body()
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            worker = worker,
                            selectedService = worker?.services?.firstOrNull()
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(isLoading = false, error = "Failed to load worker")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Failed to load worker")
                }
            }
        }
    }

    fun loadAvailability(date: String) {
        _uiState.update { it.copy(selectedDate = date, selectedTime = "") }

        viewModelScope.launch {
            try {
                val response = api.getWorkerAvailability(workerId, date)

                if (response.isSuccessful) {
                    _uiState.update {
                        it.copy(availableSlots = response.body() ?: emptyList())
                    }
                }
            } catch (e: Exception) {
                // Keep existing slots if any
            }
        }
    }

    fun selectService(service: Service) {
        _uiState.update { it.copy(selectedService = service) }
    }

    fun selectTime(time: String) {
        _uiState.update { it.copy(selectedTime = time) }
    }

    fun setDuration(duration: Int) {
        _uiState.update { it.copy(duration = duration) }
    }

    fun setAddress(address: String) {
        _uiState.update { it.copy(address = address) }
    }

    fun setCity(city: String) {
        _uiState.update { it.copy(city = city) }
    }

    fun setNotes(notes: String) {
        _uiState.update { it.copy(notes = notes) }
    }

    fun createBooking() {
        val state = _uiState.value

        if (state.selectedService == null) {
            _uiState.update { it.copy(error = "Please select a service") }
            return
        }
        if (state.selectedDate.isBlank()) {
            _uiState.update { it.copy(error = "Please select a date") }
            return
        }
        if (state.selectedTime.isBlank()) {
            _uiState.update { it.copy(error = "Please select a time") }
            return
        }
        if (state.address.isBlank()) {
            _uiState.update { it.copy(error = "Please enter your address") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isBooking = true, error = null) }

            try {
                val response = api.createBooking(
                    CreateBookingRequest(
                        serviceId = state.selectedService!!.id,
                        cleanerId = workerId,
                        scheduledDate = state.selectedDate,
                        scheduledTime = state.selectedTime,
                        duration = state.duration,
                        address = state.address,
                        city = state.city.ifBlank { null },
                        notes = state.notes.ifBlank { null }
                    )
                )

                if (response.isSuccessful) {
                    _uiState.update {
                        it.copy(
                            isBooking = false,
                            bookingSuccess = true,
                            newBookingId = response.body()?.booking?.id
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(isBooking = false, error = "Failed to create booking")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isBooking = false, error = e.message ?: "Booking failed")
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
