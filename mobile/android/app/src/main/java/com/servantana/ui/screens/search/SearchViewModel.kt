package com.servantana.ui.screens.search

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.Service
import com.servantana.data.model.Worker
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val isLoading: Boolean = false,
    val query: String = "",
    val selectedServiceId: String? = null,
    val services: List<Service> = emptyList(),
    val workers: List<Worker> = emptyList(),
    val minRating: Float = 0f,
    val error: String? = null
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val api: ServantanaApi,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    init {
        // Check for initial service filter from navigation
        savedStateHandle.get<String>("serviceId")?.let { serviceId ->
            _uiState.update { it.copy(selectedServiceId = serviceId) }
        }
        loadServices()
        searchWorkers()
    }

    private fun loadServices() {
        viewModelScope.launch {
            try {
                val response = api.getServices()
                if (response.isSuccessful) {
                    _uiState.update { it.copy(services = response.body() ?: emptyList()) }
                }
            } catch (e: Exception) {
                // Services failed to load
            }
        }
    }

    fun searchWorkers() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val state = _uiState.value
                val response = api.getWorkers(
                    serviceId = state.selectedServiceId,
                    minRating = if (state.minRating > 0) state.minRating.toDouble() else null
                )

                if (response.isSuccessful) {
                    var workers = response.body() ?: emptyList()

                    // Filter by query if provided
                    if (state.query.isNotBlank()) {
                        workers = workers.filter { worker ->
                            worker.fullName.contains(state.query, ignoreCase = true) ||
                                    worker.bio?.contains(state.query, ignoreCase = true) == true ||
                                    worker.services.any { it.name.contains(state.query, ignoreCase = true) }
                        }
                    }

                    _uiState.update { it.copy(isLoading = false, workers = workers) }
                } else {
                    _uiState.update {
                        it.copy(isLoading = false, error = "Failed to load workers")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Search failed")
                }
            }
        }
    }

    fun updateQuery(query: String) {
        _uiState.update { it.copy(query = query) }
    }

    fun selectService(serviceId: String?) {
        _uiState.update { it.copy(selectedServiceId = serviceId) }
        searchWorkers()
    }

    fun setMinRating(rating: Float) {
        _uiState.update { it.copy(minRating = rating) }
        searchWorkers()
    }

    fun clearFilters() {
        _uiState.update {
            it.copy(
                query = "",
                selectedServiceId = null,
                minRating = 0f
            )
        }
        searchWorkers()
    }
}
