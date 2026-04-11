package com.servantana.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Category
import com.servantana.app.data.model.Worker
import com.servantana.app.data.repository.AuthRepository
import com.servantana.app.data.repository.WorkerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = false,
    val userName: String? = null,
    val userLatitude: Double? = null,
    val userLongitude: Double? = null,
    val categories: List<Category> = emptyList(),
    val topWorkers: List<Worker> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val workerRepository: WorkerRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Load user info
            authRepository.getCurrentUser()
                .onSuccess { user ->
                    _uiState.update { it.copy(userName = user.firstName) }
                }

            // Load top workers
            workerRepository.getWorkers(minRating = 4.0f)
                .onSuccess { workers ->
                    _uiState.update { it.copy(topWorkers = workers.take(10)) }
                }

            // Mock categories for now (would come from API)
            val categories = listOf(
                Category("1", "Home Services", "Home Services", "🏠", null),
                Category("2", "Cleaning", "Reinigung", "🧹", null),
                Category("3", "Repairs", "Reparaturen", "🔧", null),
                Category("4", "Tutoring", "Nachhilfe", "📚", null),
                Category("5", "IT Support", "IT-Support", "💻", null),
                Category("6", "Events", "Veranstaltungen", "🎉", null)
            )
            _uiState.update { it.copy(categories = categories, isLoading = false) }
        }
    }

    fun setUserLocation(latitude: Double, longitude: Double) {
        _uiState.update {
            it.copy(userLatitude = latitude, userLongitude = longitude)
        }
    }
}
