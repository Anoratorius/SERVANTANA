package com.servantana.ui.screens.messages

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.Message
import com.servantana.data.model.SendMessageRequest
import com.servantana.data.model.User
import com.servantana.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ConversationUiState(
    val isLoading: Boolean = true,
    val messages: List<Message> = emptyList(),
    val currentUserId: String? = null,
    val partner: User? = null,
    val isSending: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ConversationViewModel @Inject constructor(
    private val api: ServantanaApi,
    private val authRepository: AuthRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val partnerId: String = checkNotNull(savedStateHandle["partnerId"])

    private val _uiState = MutableStateFlow(ConversationUiState())
    val uiState: StateFlow<ConversationUiState> = _uiState.asStateFlow()

    private var isPolling = false

    init {
        loadCurrentUser()
        startPolling()
    }

    private fun loadCurrentUser() {
        viewModelScope.launch {
            try {
                val user = authRepository.userFlow.first()
                _uiState.update { it.copy(currentUserId = user?.id) }
            } catch (e: Exception) {
                // User ID will be null
            }
        }
    }

    private fun startPolling() {
        if (isPolling) return
        isPolling = true

        viewModelScope.launch {
            while (isPolling) {
                fetchMessages()
                delay(3000) // Poll every 3 seconds
            }
        }
    }

    private suspend fun fetchMessages() {
        try {
            val response = api.getMessages(partnerId)

            if (response.isSuccessful) {
                val messages = response.body()?.messages ?: emptyList()

                // Get partner info from first message
                val partner = messages.firstOrNull()?.let { msg ->
                    if (msg.senderId == partnerId) msg.sender else msg.receiver
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        messages = messages.sortedBy { m -> m.createdAt },
                        partner = partner ?: it.partner,
                        error = null
                    )
                }

                // Mark as read
                api.markMessagesRead(partnerId)
            } else {
                if (_uiState.value.messages.isEmpty()) {
                    _uiState.update {
                        it.copy(isLoading = false, error = "Failed to load messages")
                    }
                }
            }
        } catch (e: Exception) {
            if (_uiState.value.messages.isEmpty()) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message)
                }
            }
        }
    }

    fun sendMessage(content: String) {
        if (content.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, error = null) }

            try {
                val response = api.sendMessage(
                    SendMessageRequest(
                        receiverId = partnerId,
                        content = content.trim()
                    )
                )

                if (response.isSuccessful) {
                    _uiState.update { it.copy(isSending = false) }
                    // Refresh messages to show the new one
                    fetchMessages()
                } else {
                    _uiState.update {
                        it.copy(isSending = false, error = "Failed to send message")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isSending = false, error = e.message ?: "Failed to send message")
                }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            fetchMessages()
        }
    }

    fun stopPolling() {
        isPolling = false
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }
}
