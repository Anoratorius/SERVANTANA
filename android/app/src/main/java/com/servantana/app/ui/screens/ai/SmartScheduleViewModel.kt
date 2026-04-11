package com.servantana.app.ui.screens.ai

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.TimeSlotRecommendation
import com.servantana.app.data.repository.AIRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

data class SmartScheduleUiState(
    val isLoading: Boolean = false,
    val selectedDate: LocalDate = LocalDate.now(),
    val categoryId: String = "1",
    val recommendations: List<TimeSlotRecommendation> = emptyList(),
    val demandLevel: String = "normal",
    val demandForecast: String? = null,
    val error: String? = null
)

@HiltViewModel
class SmartScheduleViewModel @Inject constructor(
    private val aiRepository: AIRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SmartScheduleUiState())
    val uiState: StateFlow<SmartScheduleUiState> = _uiState.asStateFlow()

    private val dateFormatter = DateTimeFormatter.ISO_LOCAL_DATE

    init {
        loadSchedule()
    }

    fun loadSchedule() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            aiRepository.smartSchedule(
                date = _uiState.value.selectedDate.format(dateFormatter),
                categoryId = _uiState.value.categoryId
            )
                .onSuccess { response ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            recommendations = response.recommendations,
                            demandLevel = response.demandLevel,
                            demandForecast = response.demandForecast
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Failed to load schedule"
                        )
                    }
                }
        }
    }

    fun setDate(date: LocalDate) {
        _uiState.update { it.copy(selectedDate = date) }
        loadSchedule()
    }

    fun setCategory(categoryId: String) {
        _uiState.update { it.copy(categoryId = categoryId) }
        loadSchedule()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
