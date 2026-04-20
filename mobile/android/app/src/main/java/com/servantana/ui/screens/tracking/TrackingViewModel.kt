package com.servantana.ui.screens.tracking

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.TrackingData
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TrackingUiState(
    val isLoading: Boolean = true,
    val trackingData: TrackingData? = null,
    val error: String? = null,
    val isConnected: Boolean = false
)

@HiltViewModel
class TrackingViewModel @Inject constructor(
    private val api: ServantanaApi,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val bookingId: String = checkNotNull(savedStateHandle["bookingId"])

    private val _uiState = MutableStateFlow(TrackingUiState())
    val uiState: StateFlow<TrackingUiState> = _uiState.asStateFlow()

    private var isPolling = false

    init {
        startPolling()
    }

    private fun startPolling() {
        if (isPolling) return
        isPolling = true

        viewModelScope.launch {
            while (isPolling) {
                fetchTrackingData()
                delay(5000) // Poll every 5 seconds
            }
        }
    }

    private suspend fun fetchTrackingData() {
        try {
            val response = api.getTracking(bookingId)

            if (response.isSuccessful) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        trackingData = response.body(),
                        error = null,
                        isConnected = true
                    )
                }
            } else {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to load tracking data",
                        isConnected = false
                    )
                }
            }
        } catch (e: Exception) {
            _uiState.update {
                it.copy(
                    isLoading = false,
                    error = e.message,
                    isConnected = false
                )
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            fetchTrackingData()
        }
    }

    fun stopPolling() {
        isPolling = false
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }
}
