package com.servantana.app.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SecuritySettingsState(
    val biometricEnabled: Boolean = false,
    val twoFactorEnabled: Boolean = false,
    val sessionCount: Int = 1,
    val sessions: List<SessionInfo> = emptyList(),
    val isLoadingSessions: Boolean = false,
    val isChangingPassword: Boolean = false,
    val message: String? = null
)

@HiltViewModel
class SecuritySettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _state = MutableStateFlow(SecuritySettingsState())
    val state: StateFlow<SecuritySettingsState> = _state.asStateFlow()

    init {
        loadInitialState()
    }

    private fun loadInitialState() {
        // In a real app, load these from local preferences or API
        _state.update {
            it.copy(
                sessionCount = 1,
                sessions = listOf(
                    SessionInfo(
                        id = "current",
                        deviceName = "This Device",
                        deviceType = "mobile",
                        location = "Current Location",
                        lastActive = "Now",
                        isCurrent = true
                    )
                )
            )
        }
    }

    fun toggleBiometric(enabled: Boolean) {
        _state.update { it.copy(biometricEnabled = enabled) }
        // In a real app, save this preference
        if (enabled) {
            _state.update { it.copy(message = "Biometric login enabled") }
        }
    }

    fun toggle2FA(enabled: Boolean) {
        _state.update { it.copy(twoFactorEnabled = enabled) }
        // In a real app, this would trigger 2FA setup flow
        if (enabled) {
            _state.update { it.copy(message = "Two-factor authentication enabled") }
        } else {
            _state.update { it.copy(message = "Two-factor authentication disabled") }
        }
    }

    fun changePassword(currentPassword: String, newPassword: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(isChangingPassword = true) }

            val result = authRepository.changePassword(currentPassword, newPassword)

            result.fold(
                onSuccess = {
                    _state.update {
                        it.copy(
                            isChangingPassword = false,
                            message = "Password changed successfully"
                        )
                    }
                    onSuccess()
                },
                onFailure = { error ->
                    _state.update {
                        it.copy(
                            isChangingPassword = false,
                            message = error.message ?: "Failed to change password"
                        )
                    }
                }
            )
        }
    }

    fun loadSessions() {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingSessions = true) }

            // Simulate API call - in real app, call API
            kotlinx.coroutines.delay(500)

            _state.update {
                it.copy(
                    isLoadingSessions = false,
                    sessions = listOf(
                        SessionInfo(
                            id = "current",
                            deviceName = "Android Phone",
                            deviceType = "mobile",
                            location = "Current Location",
                            lastActive = "Now",
                            isCurrent = true
                        ),
                        SessionInfo(
                            id = "web1",
                            deviceName = "Chrome on Windows",
                            deviceType = "desktop",
                            location = "Tbilisi, Georgia",
                            lastActive = "2 hours ago",
                            isCurrent = false
                        ),
                        SessionInfo(
                            id = "mobile2",
                            deviceName = "iPhone 15",
                            deviceType = "mobile",
                            location = "Berlin, Germany",
                            lastActive = "Yesterday",
                            isCurrent = false
                        )
                    ),
                    sessionCount = 3
                )
            }
        }
    }

    fun signOutAllDevices() {
        viewModelScope.launch {
            // In a real app, call API to revoke all sessions
            _state.update {
                it.copy(
                    message = "Signed out from all other devices",
                    sessionCount = 1,
                    sessions = it.sessions.filter { session -> session.isCurrent }
                )
            }
        }
    }

    fun clearMessage() {
        _state.update { it.copy(message = null) }
    }
}
