package com.servantana.app.ui.screens.worker

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.api.ServantanaApi
import com.servantana.app.data.model.SetAvailabilityRequest
import com.servantana.app.data.model.AvailabilitySlot
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import javax.inject.Inject

data class WorkerAvailabilityState(
    val availabilities: List<DayAvailability> = emptyList(),
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val hasChanges: Boolean = false,
    val message: String? = null
)

@HiltViewModel
class WorkerAvailabilityViewModel @Inject constructor(
    private val api: ServantanaApi
) : ViewModel() {

    private val _state = MutableStateFlow(WorkerAvailabilityState())
    val state: StateFlow<WorkerAvailabilityState> = _state.asStateFlow()

    private var originalAvailabilities: List<DayAvailability> = emptyList()

    init {
        loadAvailability()
    }

    private fun loadAvailability() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }

            try {
                val response = api.getWorkerAvailability()
                val availabilities = DayOfWeek.entries.map { day ->
                    val slot = response.availability.find { it.dayOfWeek == day.value }
                    DayAvailability(
                        dayOfWeek = day,
                        isEnabled = slot != null,
                        startTime = slot?.startTime ?: "09:00",
                        endTime = slot?.endTime ?: "17:00"
                    )
                }
                originalAvailabilities = availabilities
                _state.update {
                    it.copy(
                        availabilities = availabilities,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                // Default availability if API fails
                val defaultAvailabilities = DayOfWeek.entries.map { day ->
                    DayAvailability(
                        dayOfWeek = day,
                        isEnabled = day != DayOfWeek.SUNDAY,
                        startTime = "09:00",
                        endTime = "17:00"
                    )
                }
                originalAvailabilities = defaultAvailabilities
                _state.update {
                    it.copy(
                        availabilities = defaultAvailabilities,
                        isLoading = false
                    )
                }
            }
        }
    }

    fun updateAvailability(index: Int, availability: DayAvailability) {
        _state.update { currentState ->
            val newList = currentState.availabilities.toMutableList().apply {
                set(index, availability)
            }
            currentState.copy(
                availabilities = newList,
                hasChanges = newList != originalAvailabilities
            )
        }
    }

    fun saveAvailability() {
        viewModelScope.launch {
            _state.update { it.copy(isSaving = true) }

            try {
                val slots = _state.value.availabilities
                    .filter { it.isEnabled }
                    .map { avail ->
                        AvailabilitySlot(
                            dayOfWeek = avail.dayOfWeek.value,
                            startTime = avail.startTime,
                            endTime = avail.endTime
                        )
                    }

                api.setWorkerAvailability(SetAvailabilityRequest(slots))

                originalAvailabilities = _state.value.availabilities
                _state.update {
                    it.copy(
                        isSaving = false,
                        hasChanges = false,
                        message = "Availability saved successfully"
                    )
                }
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isSaving = false,
                        message = e.message ?: "Failed to save availability"
                    )
                }
            }
        }
    }

    fun clearMessage() {
        _state.update { it.copy(message = null) }
    }
}
