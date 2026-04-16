package com.servantana.app.ui.screens.ai

import android.graphics.Bitmap
import android.util.Base64
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.BeforeAfterComparison
import com.servantana.app.data.model.PhotoSummary
import com.servantana.app.data.repository.AIRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import javax.inject.Inject

enum class AnalysisMode {
    SINGLE,
    BEFORE_AFTER
}

data class PhotoAnalysisState(
    val selectedImages: List<Bitmap> = emptyList(),
    val analysisMode: AnalysisMode = AnalysisMode.SINGLE,
    val isAnalyzing: Boolean = false,
    val summary: PhotoSummary? = null,
    val comparison: BeforeAfterComparison? = null,
    val error: String? = null
)

@HiltViewModel
class PhotoAnalysisViewModel @Inject constructor(
    private val aiRepository: AIRepository
) : ViewModel() {

    private val _state = MutableStateFlow(PhotoAnalysisState())
    val state: StateFlow<PhotoAnalysisState> = _state.asStateFlow()

    fun setAnalysisMode(mode: AnalysisMode) {
        _state.update { it.copy(analysisMode = mode, selectedImages = emptyList()) }
    }

    fun addImage(bitmap: Bitmap) {
        val maxImages = if (_state.value.analysisMode == AnalysisMode.BEFORE_AFTER) 2 else 5
        if (_state.value.selectedImages.size < maxImages) {
            _state.update { it.copy(selectedImages = it.selectedImages + bitmap) }
        }
    }

    fun removeImage(index: Int) {
        _state.update {
            it.copy(selectedImages = it.selectedImages.toMutableList().apply { removeAt(index) })
        }
    }

    fun clearImages() {
        _state.update { it.copy(selectedImages = emptyList()) }
    }

    fun analyzePhotos() {
        if (_state.value.selectedImages.isEmpty()) return

        viewModelScope.launch {
            _state.update { it.copy(isAnalyzing = true, error = null, summary = null, comparison = null) }

            try {
                // Convert bitmaps to base64 data URLs
                val imageUrls = _state.value.selectedImages.map { bitmap ->
                    val outputStream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream)
                    val bytes = outputStream.toByteArray()
                    val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    "data:image/jpeg;base64,$base64"
                }

                val analysisType = if (_state.value.analysisMode == AnalysisMode.BEFORE_AFTER) {
                    "before_after"
                } else {
                    "single"
                }

                val result = aiRepository.analyzePhotos(imageUrls, analysisType)

                result.fold(
                    onSuccess = { response ->
                        _state.update {
                            it.copy(
                                isAnalyzing = false,
                                summary = response.summary,
                                comparison = response.comparison
                            )
                        }
                    },
                    onFailure = { error ->
                        _state.update {
                            it.copy(
                                isAnalyzing = false,
                                error = error.message ?: "Failed to analyze photos"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                _state.update {
                    it.copy(
                        isAnalyzing = false,
                        error = e.message ?: "An unexpected error occurred"
                    )
                }
            }
        }
    }

    fun clearResults() {
        _state.update { it.copy(summary = null, comparison = null, error = null) }
    }
}
