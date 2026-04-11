package com.servantana.app.ui.screens.properties

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class Property(
    val id: String,
    val name: String,
    val address: String,
    val city: String,
    val postalCode: String,
    val type: PropertyType,
    val size: String?,
    val rooms: Int?,
    val bathrooms: Int?,
    val isDefault: Boolean = false,
    val notes: String? = null
)

enum class PropertyType {
    APARTMENT,
    HOUSE,
    OFFICE,
    STUDIO,
    OTHER
}

data class PropertiesUiState(
    val properties: List<Property> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class PropertiesViewModel @Inject constructor() : ViewModel() {

    private val _uiState = MutableStateFlow(PropertiesUiState())
    val uiState: StateFlow<PropertiesUiState> = _uiState.asStateFlow()

    init {
        loadProperties()
    }

    fun loadProperties() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                // Mock data - would be replaced with API call
                val properties = listOf(
                    Property(
                        id = "1",
                        name = "Home",
                        address = "123 Main Street, Apt 4B",
                        city = "Berlin",
                        postalCode = "10115",
                        type = PropertyType.APARTMENT,
                        size = "85 sqm",
                        rooms = 3,
                        bathrooms = 1,
                        isDefault = true
                    ),
                    Property(
                        id = "2",
                        name = "Office",
                        address = "456 Business Park",
                        city = "Berlin",
                        postalCode = "10178",
                        type = PropertyType.OFFICE,
                        size = "120 sqm",
                        rooms = 4,
                        bathrooms = 2,
                        isDefault = false
                    )
                )
                _uiState.value = _uiState.value.copy(
                    properties = properties,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load properties"
                )
            }
        }
    }

    fun deleteProperty(propertyId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                properties = _uiState.value.properties.filter { it.id != propertyId }
            )
        }
    }

    fun setDefaultProperty(propertyId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                properties = _uiState.value.properties.map { property ->
                    property.copy(isDefault = property.id == propertyId)
                }
            )
        }
    }
}
