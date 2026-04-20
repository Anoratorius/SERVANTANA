package com.servantana.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.Booking
import com.servantana.data.model.Service
import com.servantana.data.model.User
import com.servantana.data.model.Worker
import com.servantana.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val user: User? = null,
    val services: List<Service> = emptyList(),
    val upcomingBookings: List<Booking> = emptyList(),
    val featuredWorkers: List<Worker> = emptyList(),
    val unreadMessageCount: Int = 0,
    val error: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val api: ServantanaApi,
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadHomeData()
    }

    fun loadHomeData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                // Load user from local storage first
                authRepository.userFlow.collect { user ->
                    _uiState.update { it.copy(user = user) }
                }
            } catch (e: Exception) {
                // Ignore - will fetch from API
            }

            // Fetch services
            launch {
                try {
                    val response = api.getServices()
                    if (response.isSuccessful) {
                        _uiState.update { it.copy(services = response.body() ?: emptyList()) }
                    }
                } catch (e: Exception) {
                    // Services failed to load
                }
            }

            // Fetch upcoming bookings
            launch {
                try {
                    val response = api.getBookings(status = "PENDING,CONFIRMED,IN_PROGRESS")
                    if (response.isSuccessful) {
                        val bookings = response.body()?.bookings ?: emptyList()
                        _uiState.update {
                            it.copy(upcomingBookings = bookings.take(3))
                        }
                    }
                } catch (e: Exception) {
                    // Bookings failed to load
                }
            }

            // Fetch featured workers
            launch {
                try {
                    val response = api.getWorkers(minRating = 4.5)
                    if (response.isSuccessful) {
                        _uiState.update {
                            it.copy(featuredWorkers = response.body()?.take(6) ?: emptyList())
                        }
                    }
                } catch (e: Exception) {
                    // Workers failed to load
                }
            }

            // Fetch unread message count
            launch {
                try {
                    val response = api.getConversations()
                    if (response.isSuccessful) {
                        val unread = response.body()?.conversations?.sumOf { it.unreadCount } ?: 0
                        _uiState.update { it.copy(unreadMessageCount = unread) }
                    }
                } catch (e: Exception) {
                    // Messages failed to load
                }
            }

            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun refresh() {
        loadHomeData()
    }
}
