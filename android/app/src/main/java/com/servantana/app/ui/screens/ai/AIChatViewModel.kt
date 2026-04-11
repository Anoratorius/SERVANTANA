package com.servantana.app.ui.screens.ai

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.AIChatMessage
import com.servantana.app.data.model.SuggestedAction
import com.servantana.app.data.repository.AIRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

data class AIChatUiState(
    val messages: List<AIChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val suggestedActions: List<SuggestedAction> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class AIChatViewModel @Inject constructor(
    private val aiRepository: AIRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AIChatUiState())
    val uiState: StateFlow<AIChatUiState> = _uiState.asStateFlow()

    init {
        // Add welcome message
        val welcomeMessage = AIChatMessage(
            id = UUID.randomUUID().toString(),
            role = "assistant",
            content = "Hello! I'm your Servantana AI assistant. I can help you:\n\n" +
                    "• Find the perfect worker for your needs\n" +
                    "• Get instant price estimates\n" +
                    "• Answer questions about services\n" +
                    "• Help schedule appointments\n\n" +
                    "What can I help you with today?",
            timestamp = System.currentTimeMillis()
        )
        _uiState.update {
            it.copy(
                messages = listOf(welcomeMessage),
                suggestedActions = getInitialSuggestions()
            )
        }
    }

    private fun getInitialSuggestions(): List<SuggestedAction> = listOf(
        SuggestedAction(
            type = "search",
            label = "Find a cleaner",
            icon = "cleaning"
        ),
        SuggestedAction(
            type = "search",
            label = "Get a price estimate",
            icon = "price"
        ),
        SuggestedAction(
            type = "search",
            label = "Book a repair service",
            icon = "repair"
        )
    )

    fun sendMessage(content: String) {
        if (content.isBlank()) return

        val userMessage = AIChatMessage(
            id = UUID.randomUUID().toString(),
            role = "user",
            content = content.trim(),
            timestamp = System.currentTimeMillis()
        )

        _uiState.update {
            it.copy(
                messages = it.messages + userMessage,
                isLoading = true,
                error = null,
                suggestedActions = emptyList()
            )
        }

        viewModelScope.launch {
            aiRepository.chat(content, _uiState.value.messages.dropLast(1))
                .onSuccess { response ->
                    val assistantMessage = AIChatMessage(
                        id = UUID.randomUUID().toString(),
                        role = "assistant",
                        content = response.message,
                        timestamp = System.currentTimeMillis()
                    )
                    _uiState.update {
                        it.copy(
                            messages = it.messages + assistantMessage,
                            isLoading = false,
                            suggestedActions = response.suggestedActions
                        )
                    }
                }
                .onFailure { exception ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = exception.message ?: "Failed to get response"
                        )
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
