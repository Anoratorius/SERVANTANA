package com.servantana.app.ui.screens.messages

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Message
import com.servantana.app.data.model.User
import com.servantana.app.data.repository.MessageRepository
import com.servantana.app.data.repository.WorkerRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class ChatUiState(
    val isLoading: Boolean = false,
    val otherUser: User? = null,
    val messages: List<Message> = emptyList(),
    val isSending: Boolean = false,
    val error: String? = null,
    val isPolling: Boolean = false
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val messageRepository: MessageRepository,
    private val workerRepository: WorkerRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val userId: String = checkNotNull(savedStateHandle["userId"])

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private var pollingJob: Job? = null
    private val pollingIntervalMs = 3000L // 3 seconds

    init {
        loadChat()
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }

    private fun loadChat() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // Load other user info
            workerRepository.getWorker(userId)
                .onSuccess { worker ->
                    _uiState.update {
                        it.copy(
                            otherUser = User(
                                id = worker.id,
                                email = worker.email,
                                firstName = worker.firstName,
                                lastName = worker.lastName,
                                avatar = worker.avatar,
                                role = worker.role
                            )
                        )
                    }
                }

            // Load messages
            messageRepository.getMessages(userId)
                .onSuccess { messages ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            messages = messages.sortedBy { msg -> msg.timestamp }
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Failed to load messages"
                        )
                    }
                }
        }
    }

    fun sendMessage(content: String) {
        if (content.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true) }

            // Optimistically add message to UI
            val tempMessage = Message(
                id = UUID.randomUUID().toString(),
                senderId = "currentUser", // Will be replaced by actual user ID
                receiverId = userId,
                content = content.trim(),
                timestamp = System.currentTimeMillis(),
                isRead = false
            )

            _uiState.update {
                it.copy(messages = it.messages + tempMessage)
            }

            messageRepository.sendMessage(userId, content.trim())
                .onSuccess { message ->
                    // Replace temp message with actual message
                    _uiState.update {
                        it.copy(
                            isSending = false,
                            messages = it.messages.dropLast(1) + message
                        )
                    }
                }
                .onFailure { exception ->
                    // Remove temp message and show error
                    _uiState.update {
                        it.copy(
                            isSending = false,
                            messages = it.messages.dropLast(1),
                            error = exception.message ?: "Failed to send message"
                        )
                    }
                }
        }
    }

    fun refresh() {
        loadChat()
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    // MARK: - Real-time Polling

    /**
     * Start polling for new messages when chat view is visible
     */
    fun startPolling() {
        if (pollingJob != null) return

        _uiState.update { it.copy(isPolling = true) }

        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(pollingIntervalMs)
                refreshMessages()
            }
        }
    }

    /**
     * Stop polling when chat view disappears
     */
    fun stopPolling() {
        pollingJob?.cancel()
        pollingJob = null
        _uiState.update { it.copy(isPolling = false) }
    }

    /**
     * Refresh messages without showing loading state (for background updates)
     */
    private suspend fun refreshMessages() {
        messageRepository.getMessages(userId)
            .onSuccess { newMessages ->
                val sortedMessages = newMessages.sortedBy { it.timestamp }
                val currentMessages = _uiState.value.messages

                // Only update if there are new messages
                if (sortedMessages.size != currentMessages.size ||
                    sortedMessages.lastOrNull()?.id != currentMessages.lastOrNull()?.id) {
                    _uiState.update { it.copy(messages = sortedMessages) }
                }
            }
            // Silently ignore polling errors
    }
}
