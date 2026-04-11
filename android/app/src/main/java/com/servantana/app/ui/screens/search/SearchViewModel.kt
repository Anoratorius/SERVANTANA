package com.servantana.app.ui.screens.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Worker
import com.servantana.app.data.repository.WorkerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val isLoading: Boolean = false,
    val query: String = "",
    val workers: List<Worker> = emptyList(),
    val selectedCategoryId: String? = null,
    val minRating: Float? = null,
    val maxPrice: Double? = null,
    val sortBy: SortOption = SortOption.RATING,
    val error: String? = null
)

enum class SortOption {
    RATING, PRICE_LOW, PRICE_HIGH, REVIEWS
}

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val workerRepository: WorkerRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    fun search(query: String) {
        _uiState.update { it.copy(query = query) }

        // Debounce search
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // 300ms debounce
            performSearch()
        }
    }

    fun setCategory(categoryId: String?) {
        _uiState.update { it.copy(selectedCategoryId = categoryId) }
        performSearch()
    }

    fun setMinRating(rating: Float?) {
        _uiState.update { it.copy(minRating = rating) }
        performSearch()
    }

    fun setMaxPrice(price: Double?) {
        _uiState.update { it.copy(maxPrice = price) }
        performSearch()
    }

    fun setSortOption(option: SortOption) {
        _uiState.update { it.copy(sortBy = option) }
        performSearch()
    }

    private fun performSearch() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val state = _uiState.value

            workerRepository.getWorkers(
                search = state.query.takeIf { it.isNotBlank() },
                categoryId = state.selectedCategoryId,
                minRating = state.minRating
            )
                .onSuccess { workers ->
                    var filtered = workers

                    // Apply max price filter
                    state.maxPrice?.let { max ->
                        filtered = filtered.filter { worker ->
                            worker.workerProfile?.hourlyRate?.let { it <= max } ?: false
                        }
                    }

                    // Apply sorting
                    filtered = when (state.sortBy) {
                        SortOption.RATING -> filtered.sortedByDescending {
                            it.workerProfile?.averageRating ?: 0.0
                        }
                        SortOption.PRICE_LOW -> filtered.sortedBy {
                            it.workerProfile?.hourlyRate ?: Double.MAX_VALUE
                        }
                        SortOption.PRICE_HIGH -> filtered.sortedByDescending {
                            it.workerProfile?.hourlyRate ?: 0.0
                        }
                        SortOption.REVIEWS -> filtered.sortedByDescending {
                            it.workerProfile?.totalBookings ?: 0
                        }
                    }

                    _uiState.update {
                        it.copy(isLoading = false, workers = filtered)
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Search failed"
                        )
                    }
                }
        }
    }

    fun clearFilters() {
        _uiState.update {
            it.copy(
                selectedCategoryId = null,
                minRating = null,
                maxPrice = null,
                sortBy = SortOption.RATING
            )
        }
        performSearch()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
