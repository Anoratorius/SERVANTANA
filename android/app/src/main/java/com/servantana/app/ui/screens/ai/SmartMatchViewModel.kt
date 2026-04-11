package com.servantana.app.ui.screens.ai

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.SmartMatchResult
import com.servantana.app.data.repository.AIRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SmartMatchUiState(
    val isLoading: Boolean = false,
    val results: List<SmartMatchResult> = emptyList(),
    val selectedCategoryId: String? = null,
    val latitude: Double = 52.52,
    val longitude: Double = 13.405,
    val error: String? = null
)

@HiltViewModel
class SmartMatchViewModel @Inject constructor(
    private val aiRepository: AIRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val _uiState = MutableStateFlow(SmartMatchUiState())
    val uiState: StateFlow<SmartMatchUiState> = _uiState.asStateFlow()

    init {
        // Get location from navigation arguments
        val lat = savedStateHandle.get<Double>("latitude") ?: 52.52
        val lng = savedStateHandle.get<Double>("longitude") ?: 13.405
        _uiState.update { it.copy(latitude = lat, longitude = lng) }
    }

    fun findMatches(categoryId: String? = null, maxDistance: Double = 25.0) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    error = null,
                    selectedCategoryId = categoryId
                )
            }

            aiRepository.smartMatch(
                categoryId = categoryId,
                latitude = _uiState.value.latitude,
                longitude = _uiState.value.longitude,
                maxDistance = maxDistance
            )
                .onSuccess { results ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            results = results
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Failed to find matches"
                        )
                    }
                }
        }
    }

    fun updateLocation(latitude: Double, longitude: Double) {
        _uiState.update {
            it.copy(latitude = latitude, longitude = longitude)
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
