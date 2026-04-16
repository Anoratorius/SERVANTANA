package com.servantana.app.ui.screens.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Worker
import com.servantana.app.data.repository.LocationRepository
import com.servantana.app.data.repository.WorkerRepository
import com.servantana.app.service.LocationResult
import com.servantana.app.service.LocationService
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
    val sortBy: SortOption = SortOption.DISTANCE,
    val error: String? = null,
    // Location state
    val useLocation: Boolean = true,
    val currentLatitude: Double? = null,
    val currentLongitude: Double? = null,
    val maxDistance: Int = 25,
    val isLoadingLocation: Boolean = false,
    val locationError: String? = null,
    val hasLocationPermission: Boolean = false
)

enum class SortOption {
    DISTANCE, RATING, PRICE_LOW, PRICE_HIGH, REVIEWS
}

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val workerRepository: WorkerRepository,
    private val locationService: LocationService,
    private val locationRepository: LocationRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        // Check if location permission is granted
        _uiState.update {
            it.copy(hasLocationPermission = locationService.hasLocationPermission())
        }
    }

    fun search(query: String) {
        _uiState.update { it.copy(query = query) }

        // Debounce search
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300) // 300ms debounce
            performSearch()
        }
    }

    fun searchWithLocation(query: String = "", categoryId: String? = null) {
        viewModelScope.launch {
            val state = _uiState.value
            if (state.useLocation && state.currentLatitude == null) {
                fetchCurrentLocation()
            }
            _uiState.update {
                it.copy(
                    query = query,
                    selectedCategoryId = categoryId ?: it.selectedCategoryId
                )
            }
            performSearch()
        }
    }

    fun fetchCurrentLocation() {
        viewModelScope.launch {
            if (!locationService.hasLocationPermission()) {
                _uiState.update {
                    it.copy(
                        locationError = "Location permission required to find nearby workers",
                        hasLocationPermission = false
                    )
                }
                return@launch
            }

            _uiState.update {
                it.copy(
                    isLoadingLocation = true,
                    locationError = null,
                    hasLocationPermission = true
                )
            }

            when (val result = locationService.getCurrentLocationWithGeocoding()) {
                is LocationResult.Success -> {
                    _uiState.update {
                        it.copy(
                            currentLatitude = result.location.latitude,
                            currentLongitude = result.location.longitude,
                            isLoadingLocation = false
                        )
                    }
                    // Sync location to server
                    locationRepository.updateUserLocation(
                        latitude = result.location.latitude,
                        longitude = result.location.longitude,
                        city = result.location.city,
                        country = result.location.country
                    )
                }
                is LocationResult.Error -> {
                    _uiState.update {
                        it.copy(
                            locationError = result.message,
                            isLoadingLocation = false
                        )
                    }
                }
                LocationResult.PermissionDenied -> {
                    _uiState.update {
                        it.copy(
                            locationError = "Location permission denied",
                            isLoadingLocation = false,
                            hasLocationPermission = false
                        )
                    }
                }
                LocationResult.Loading -> {
                    // Already handled
                }
            }
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

    fun toggleLocationFilter() {
        _uiState.update { it.copy(useLocation = !it.useLocation) }
        viewModelScope.launch {
            if (_uiState.value.useLocation) {
                searchWithLocation()
            } else {
                performSearch()
            }
        }
    }

    fun updateMaxDistance(distance: Int) {
        _uiState.update { it.copy(maxDistance = distance) }
        performSearch()
    }

    fun onLocationPermissionResult(granted: Boolean) {
        _uiState.update { it.copy(hasLocationPermission = granted) }
        if (granted && _uiState.value.useLocation) {
            fetchCurrentLocation()
        }
    }

    private fun performSearch() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val state = _uiState.value

            workerRepository.getWorkers(
                search = state.query.takeIf { it.isNotBlank() },
                categoryId = state.selectedCategoryId,
                minRating = state.minRating,
                latitude = if (state.useLocation) state.currentLatitude else null,
                longitude = if (state.useLocation) state.currentLongitude else null,
                maxDistance = if (state.useLocation) state.maxDistance else null
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
                        SortOption.DISTANCE -> {
                            // Sort by distance (closest first) - only if location enabled
                            if (state.useLocation && state.currentLatitude != null) {
                                filtered.sortedBy { worker ->
                                    worker.workerProfile?.distance ?: Float.MAX_VALUE
                                }
                            } else {
                                // Fall back to rating if no location
                                filtered.sortedByDescending {
                                    it.workerProfile?.averageRating ?: 0.0
                                }
                            }
                        }
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
                sortBy = if (it.useLocation) SortOption.DISTANCE else SortOption.RATING,
                maxDistance = 25
            )
        }
        performSearch()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun clearLocationError() {
        _uiState.update { it.copy(locationError = null) }
    }
}
