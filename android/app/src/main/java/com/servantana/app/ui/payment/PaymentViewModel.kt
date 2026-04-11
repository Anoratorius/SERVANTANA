package com.servantana.app.ui.payment

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.Booking
import com.servantana.app.data.repository.PaymentRepository
import com.stripe.android.PaymentConfiguration
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PaymentUiState(
    val isLoading: Boolean = false,
    val isPaymentReady: Boolean = false,
    val paymentResult: PaymentResult? = null,
    val error: String? = null,
    val customerConfig: PaymentSheet.CustomerConfiguration? = null,
    val paymentIntentClientSecret: String? = null
)

sealed class PaymentResult {
    data object Success : PaymentResult()
    data object Canceled : PaymentResult()
    data class Failed(val message: String) : PaymentResult()
}

@HiltViewModel
class PaymentViewModel @Inject constructor(
    application: Application,
    private val paymentRepository: PaymentRepository
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState: StateFlow<PaymentUiState> = _uiState.asStateFlow()

    fun preparePayment(bookingId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            paymentRepository.createPaymentIntent(bookingId)
                .onSuccess { response ->
                    // Configure Stripe
                    PaymentConfiguration.init(
                        getApplication(),
                        response.publishableKey
                    )

                    val customerConfig = PaymentSheet.CustomerConfiguration(
                        id = response.customer,
                        ephemeralKeySecret = response.ephemeralKey
                    )

                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        isPaymentReady = true,
                        customerConfig = customerConfig,
                        paymentIntentClientSecret = response.paymentIntent
                    )
                }
                .onFailure { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = error.message ?: "Failed to prepare payment"
                    )
                }
        }
    }

    fun onPaymentSheetResult(paymentSheetResult: PaymentSheetResult) {
        val result = when (paymentSheetResult) {
            is PaymentSheetResult.Completed -> PaymentResult.Success
            is PaymentSheetResult.Canceled -> PaymentResult.Canceled
            is PaymentSheetResult.Failed -> PaymentResult.Failed(
                paymentSheetResult.error.localizedMessage ?: "Payment failed"
            )
        }
        _uiState.value = _uiState.value.copy(paymentResult = result)
    }

    fun resetPaymentState() {
        _uiState.value = PaymentUiState()
    }
}
