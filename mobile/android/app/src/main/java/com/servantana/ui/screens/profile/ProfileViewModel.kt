package com.servantana.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.User
import com.servantana.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val isLoading: Boolean = true,
    val user: User? = null,
    val error: String? = null,
    val isEditing: Boolean = false,
    val isSaving: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val api: ServantanaApi,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val response = api.getProfile()

                if (response.isSuccessful) {
                    _uiState.update {
                        it.copy(isLoading = false, user = response.body())
                    }
                } else {
                    _uiState.update {
                        it.copy(isLoading = false, error = "Failed to load profile")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Failed to load profile")
                }
            }
        }
    }

    fun toggleEditing() {
        _uiState.update { it.copy(isEditing = !it.isEditing) }
    }

    fun updateProfile(firstName: String, lastName: String, phone: String?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }

            try {
                val updates = mutableMapOf(
                    "firstName" to firstName,
                    "lastName" to lastName
                )
                if (phone != null) {
                    updates["phone"] = phone
                }

                val response = api.updateProfile(updates)

                if (response.isSuccessful) {
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            isEditing = false,
                            user = response.body()
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(isSaving = false, error = "Failed to update profile")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSaving = false, error = e.message ?: "Update failed")
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}
