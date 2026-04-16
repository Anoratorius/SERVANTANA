package com.servantana.app.ui.screens.ai

import android.graphics.Bitmap
import android.util.Base64
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.PriceEstimateRequest
import com.servantana.app.data.model.PriceEstimateResponse
import com.servantana.app.data.repository.AIRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import javax.inject.Inject

data class PriceEstimateState(
    val selectedImages: List<Bitmap> = emptyList(),
    val serviceType: String = "cleaning",
    val additionalInfo: String = "",
    val isLoading: Boolean = false,
    val estimate: PriceEstimateResponse? = null,
    val error: String? = null
)

@HiltViewModel
class PriceEstimateViewModel @Inject constructor(
    private val aiRepository: AIRepository
) : ViewModel() {

    private val _state = MutableStateFlow(PriceEstimateState())
    val state: StateFlow<PriceEstimateState> = _state.asStateFlow()

    fun addImage(bitmap: Bitmap) {
        if (_state.value.selectedImages.size < 5) {
            _state.update {
                it.copy(selectedImages = it.selectedImages + bitmap, error = null)
            }
        }
    }

    fun removeImage(index: Int) {
        _state.update {
            it.copy(
                selectedImages = it.selectedImages.filterIndexed { i, _ -> i != index },
                estimate = null
            )
        }
    }

    fun setServiceType(type: String) {
        _state.update { it.copy(serviceType = type, estimate = null) }
    }

    fun setAdditionalInfo(info: String) {
        _state.update { it.copy(additionalInfo = info) }
    }

    fun getEstimate() {
        if (_state.value.selectedImages.isEmpty()) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }

            try {
                // Convert bitmaps to base64 data URLs
                val imageUrls = _state.value.selectedImages.map { bitmap ->
                    bitmapToDataUrl(bitmap)
                }

                val result = aiRepository.estimatePrice(
                    imageUrls = imageUrls,
                    serviceType = _state.value.serviceType,
                    additionalInfo = _state.value.additionalInfo.ifBlank { null }
                )

                result.fold(
                    onSuccess = { response ->
                        _state.update { it.copy(estimate = response, isLoading = false) }
                    },
                    onFailure = { error ->
                        _state.update {
                            it.copy(
                                error = error.message ?: "Failed to get estimate",
                                isLoading = false
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        error = e.message ?: "An unexpected error occurred",
                        isLoading = false
                    )
                }
            }
        }
    }

    private fun bitmapToDataUrl(bitmap: Bitmap): String {
        val outputStream = ByteArrayOutputStream()
        // Scale down if too large
        val scaledBitmap = if (bitmap.width > 1024 || bitmap.height > 1024) {
            val scale = 1024f / maxOf(bitmap.width, bitmap.height)
            Bitmap.createScaledBitmap(
                bitmap,
                (bitmap.width * scale).toInt(),
                (bitmap.height * scale).toInt(),
                true
            )
        } else {
            bitmap
        }
        scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 80, outputStream)
        val base64 = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
        return "data:image/jpeg;base64,$base64"
    }
}
