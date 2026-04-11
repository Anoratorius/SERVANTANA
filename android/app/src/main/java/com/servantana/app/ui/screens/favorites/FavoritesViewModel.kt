package com.servantana.app.ui.screens.favorites

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Worker
import com.servantana.app.data.repository.FavoritesRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class FavoritesUiState(
    val favorites: List<Worker> = emptyList(),
    val isLoading: Boolean = false,
    val isRemoving: String? = null,
    val error: String? = null
)

@HiltViewModel
class FavoritesViewModel @Inject constructor(
    private val favoritesRepository: FavoritesRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(FavoritesUiState())
    val uiState: StateFlow<FavoritesUiState> = _uiState.asStateFlow()

    init {
        loadFavorites()
    }

    fun loadFavorites() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val favorites = favoritesRepository.getFavorites()
                _uiState.value = _uiState.value.copy(
                    favorites = favorites,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load favorites"
                )
            }
        }
    }

    fun removeFavorite(workerId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRemoving = workerId)
            try {
                favoritesRepository.removeFavorite(workerId)
                _uiState.value = _uiState.value.copy(
                    favorites = _uiState.value.favorites.filter { it.id != workerId },
                    isRemoving = null
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isRemoving = null,
                    error = e.message ?: "Failed to remove favorite"
                )
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
