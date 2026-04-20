package com.servantana.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RegisterUiState(
    val isLoading: Boolean = false,
    val isRegistered: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class RegisterViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

    fun register(
        email: String,
        password: String,
        confirmPassword: String,
        firstName: String,
        lastName: String,
        phone: String?,
        isWorker: Boolean
    ) {
        // Validation
        if (firstName.isBlank() || lastName.isBlank()) {
            _uiState.update { it.copy(error = "Please enter your name") }
            return
        }

        if (email.isBlank() || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            _uiState.update { it.copy(error = "Please enter a valid email address") }
            return
        }

        if (password.length < 8) {
            _uiState.update { it.copy(error = "Password must be at least 8 characters") }
            return
        }

        if (password != confirmPassword) {
            _uiState.update { it.copy(error = "Passwords do not match") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            val result = authRepository.register(
                email = email.trim(),
                password = password,
                firstName = firstName.trim(),
                lastName = lastName.trim(),
                phone = phone?.trim(),
                role = if (isWorker) "CLEANER" else "CUSTOMER"
            )

            result.fold(
                onSuccess = {
                    _uiState.update { it.copy(isLoading = false, isRegistered = true) }
                },
                onFailure = { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Registration failed"
                        )
                    }
                }
            )
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
