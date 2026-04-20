package com.servantana.ui.screens.worker

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.Review
import com.servantana.data.model.Worker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WorkerProfileUiState(
    val isLoading: Boolean = true,
    val worker: Worker? = null,
    val reviews: List<Review> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class WorkerProfileViewModel @Inject constructor(
    private val api: ServantanaApi,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val workerId: String = checkNotNull(savedStateHandle["workerId"])

    private val _uiState = MutableStateFlow(WorkerProfileUiState())
    val uiState: StateFlow<WorkerProfileUiState> = _uiState.asStateFlow()

    init {
        loadWorker()
    }

    fun loadWorker() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Load worker details
                val workerResponse = api.getWorker(workerId)

                if (workerResponse.isSuccessful) {
                    _uiState.update {
                        it.copy(worker = workerResponse.body())
                    }
                }

                // Load reviews
                val reviewsResponse = api.getWorkerReviews(workerId)
                if (reviewsResponse.isSuccessful) {
                    _uiState.update {
                        it.copy(reviews = reviewsResponse.body() ?: emptyList())
                    }
                }

                _uiState.update { it.copy(isLoading = false) }

                if (!workerResponse.isSuccessful) {
                    _uiState.update {
                        it.copy(error = "Failed to load worker profile")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Failed to load worker")
                }
            }
        }
    }

    fun refresh() {
        loadWorker()
    }
}
