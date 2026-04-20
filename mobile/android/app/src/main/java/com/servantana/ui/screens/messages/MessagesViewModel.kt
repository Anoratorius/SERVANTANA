package com.servantana.ui.screens.messages

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.Conversation
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class MessagesUiState(
    val isLoading: Boolean = true,
    val conversations: List<Conversation> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class MessagesViewModel @Inject constructor(
    private val api: ServantanaApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(MessagesUiState())
    val uiState: StateFlow<MessagesUiState> = _uiState.asStateFlow()

    init {
        loadConversations()
    }

    fun loadConversations() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                val response = api.getConversations()

                if (response.isSuccessful) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            conversations = response.body()?.conversations ?: emptyList()
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(isLoading = false, error = "Failed to load messages")
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message ?: "Failed to load messages")
                }
            }
        }
    }

    fun refresh() {
        loadConversations()
    }
}
