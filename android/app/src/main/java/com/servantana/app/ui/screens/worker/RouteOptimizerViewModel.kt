package com.servantana.app.ui.screens.worker

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.OptimizedRoute
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

data class RouteOptimizerState(
    val selectedDate: LocalDate = LocalDate.now(),
    val isLoading: Boolean = false,
    val route: OptimizedRoute? = null,
    val error: String? = null,
    val hasSearched: Boolean = false
)

@HiltViewModel
class RouteOptimizerViewModel @Inject constructor(
    private val aiRepository: AIRepository
) : ViewModel() {

    private val _state = MutableStateFlow(RouteOptimizerState())
    val state: StateFlow<RouteOptimizerState> = _state.asStateFlow()

    fun setDate(date: LocalDate) {
        _state.update {
            it.copy(
                selectedDate = date,
                route = null,
                error = null,
                hasSearched = false
            )
        }
    }

    fun optimizeRoute() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            try {
                val dateStr = _state.value.selectedDate.format(DateTimeFormatter.ISO_LOCAL_DATE)

                val result = aiRepository.optimizeRoute(
                    date = dateStr,
                    bookingIds = null, // Let API get all bookings for the day
                    startLatitude = null, // Will use worker's saved location
                    startLongitude = null
                )

                result.fold(
                    onSuccess = { response ->
                        _state.update {
                            it.copy(
                                route = response.route,
                                isLoading = false,
                                hasSearched = true
                            )
                        }
                    },
                    onFailure = { error ->
                        _state.update {
                            it.copy(
                                error = error.message ?: "Failed to optimize route",
                                isLoading = false,
                                hasSearched = true
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        error = e.message ?: "An unexpected error occurred",
                        isLoading = false,
                        hasSearched = true
                    )
                }
            }
        }
    }
}
