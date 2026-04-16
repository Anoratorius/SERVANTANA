package com.servantana.app.ui.screens.booking

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Service
import com.servantana.app.data.model.Worker
import com.servantana.app.data.repository.BookingRepository
import com.servantana.app.data.repository.ServiceRepository
import com.servantana.app.data.repository.WorkerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalTime
import javax.inject.Inject

data class CreateBookingUiState(
    val isLoading: Boolean = false,
    val worker: Worker? = null,
    val services: List<Service> = emptyList(),
    val selectedServiceId: String? = null,
    val selectedDate: LocalDate = LocalDate.now().plusDays(1),
    val selectedTime: LocalTime = LocalTime.of(10, 0),
    val duration: Int = 2,
    val address: String = "",
    val notes: String = "",
    val estimatedPrice: Double = 0.0,
    val isSubmitting: Boolean = false,
    val isSuccess: Boolean = false,
    val createdBookingId: String? = null,
    val showConfirmation: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class CreateBookingViewModel @Inject constructor(
    private val workerRepository: WorkerRepository,
    private val serviceRepository: ServiceRepository,
    private val bookingRepository: BookingRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val workerId: String = checkNotNull(savedStateHandle["workerId"])

    private val _uiState = MutableStateFlow(CreateBookingUiState())
    val uiState: StateFlow<CreateBookingUiState> = _uiState.asStateFlow()

    init {
        loadWorkerAndServices()
    }

    private fun loadWorkerAndServices() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            workerRepository.getWorker(workerId)
                .onSuccess { worker ->
                    _uiState.update { it.copy(worker = worker) }
                    calculatePrice()
                }

            serviceRepository.getServices()
                .onSuccess { services ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            services = services,
                            selectedServiceId = services.firstOrNull()?.id
                        )
                    }
                    calculatePrice()
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Failed to load data"
                        )
                    }
                }
        }
    }

    fun setService(serviceId: String) {
        _uiState.update { it.copy(selectedServiceId = serviceId) }
        calculatePrice()
    }

    fun setDate(date: LocalDate) {
        _uiState.update { it.copy(selectedDate = date) }
    }

    fun setTime(time: LocalTime) {
        _uiState.update { it.copy(selectedTime = time) }
    }

    fun setDuration(hours: Int) {
        _uiState.update { it.copy(duration = hours.coerceIn(1, 8)) }
        calculatePrice()
    }

    fun setAddress(address: String) {
        _uiState.update { it.copy(address = address) }
    }

    fun setNotes(notes: String) {
        _uiState.update { it.copy(notes = notes) }
    }

    private fun calculatePrice() {
        val state = _uiState.value
        val hourlyRate = state.worker?.workerProfile?.hourlyRate ?: 0.0
        val estimated = hourlyRate * state.duration
        _uiState.update { it.copy(estimatedPrice = estimated) }
    }

    fun createBooking() {
        val state = _uiState.value

        if (state.selectedServiceId == null) {
            _uiState.update { it.copy(error = "Please select a service") }
            return
        }

        if (state.address.isBlank()) {
            _uiState.update { it.copy(error = "Please enter your address") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            bookingRepository.createBooking(
                workerId = workerId,
                serviceId = state.selectedServiceId,
                scheduledDate = state.selectedDate.toString(),
                scheduledTime = state.selectedTime.toString(),
                duration = state.duration,
                address = state.address,
                notes = state.notes.takeIf { it.isNotBlank() }
            )
                .onSuccess { booking ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            isSuccess = true,
                            createdBookingId = booking.id,
                            showConfirmation = true
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = exception.message ?: "Failed to create booking"
                        )
                    }
                }
        }
    }

    fun dismissConfirmation() {
        _uiState.update { it.copy(showConfirmation = false) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
