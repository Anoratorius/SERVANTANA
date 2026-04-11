package com.servantana.app.ui.screens.search

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Review
import com.servantana.app.data.model.Worker
import com.servantana.app.data.repository.ReviewRepository
import com.servantana.app.data.repository.WorkerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WorkerProfileUiState(
    val isLoading: Boolean = false,
    val worker: Worker? = null,
    val reviews: List<Review> = emptyList(),
    val isFavorite: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class WorkerProfileViewModel @Inject constructor(
    private val workerRepository: WorkerRepository,
    private val reviewRepository: ReviewRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val workerId: String = checkNotNull(savedStateHandle["workerId"])

    private val _uiState = MutableStateFlow(WorkerProfileUiState())
    val uiState: StateFlow<WorkerProfileUiState> = _uiState.asStateFlow()

    init {
        loadWorker()
    }

    private fun loadWorker() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            workerRepository.getWorker(workerId)
                .onSuccess { worker ->
                    _uiState.update { it.copy(worker = worker) }
                    loadReviews()
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Failed to load worker"
                        )
                    }
                }
        }
    }

    private fun loadReviews() {
        viewModelScope.launch {
            reviewRepository.getReviews(workerId)
                .onSuccess { reviews ->
                    _uiState.update {
                        it.copy(isLoading = false, reviews = reviews)
                    }
                }
                .onFailure {
                    _uiState.update { it.copy(isLoading = false) }
                }
        }
    }

    fun toggleFavorite() {
        viewModelScope.launch {
            val newState = !_uiState.value.isFavorite
            _uiState.update { it.copy(isFavorite = newState) }

            // In production, would call API to persist
            // favoriteRepository.toggleFavorite(workerId)
        }
    }

    fun refresh() {
        loadWorker()
    }
}
