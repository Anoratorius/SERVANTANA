package com.servantana.app.ui.payment

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Error
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.BookingApiModel
import com.servantana.app.data.repository.BookingRepository
import com.servantana.app.data.repository.PaymentRepository
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult
import com.stripe.android.paymentsheet.rememberPaymentSheet
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.*
import javax.inject.Inject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentScreen(
    onNavigateBack: () -> Unit,
    onPaymentSuccess: () -> Unit,
    viewModel: PaymentViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    val paymentSheet = rememberPaymentSheet { result ->
        viewModel.onPaymentSheetResult(result)
    }

    // Handle payment result
    LaunchedEffect(uiState.paymentResult) {
        when (uiState.paymentResult) {
            is PaymentResult.Success -> {
                onPaymentSuccess()
            }
            else -> {}
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        when {
            uiState.isLoadingBooking -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.bookingError != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.Error,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(uiState.bookingError!!)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadBooking() }) {
                            Text("Retry")
                        }
                    }
                }
            }
            uiState.booking != null -> {
                PaymentContent(
                    booking = uiState.booking!!,
                    uiState = uiState,
                    onPay = { clientSecret ->
                        val configuration = PaymentSheet.Configuration(
                            merchantDisplayName = "Servantana",
                            customer = uiState.customerConfig,
                            googlePay = PaymentSheet.GooglePayConfiguration(
                                environment = PaymentSheet.GooglePayConfiguration.Environment.Test,
                                countryCode = "DE",
                                currencyCode = uiState.booking?.currency ?: "EUR"
                            )
                        )
                        paymentSheet.presentWithPaymentIntent(clientSecret, configuration)
                    },
                    modifier = Modifier.padding(padding)
                )
            }
        }
    }
}

@Composable
private fun PaymentContent(
    booking: BookingApiModel,
    uiState: PaymentUiState,
    onPay: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Booking Summary
        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Payment Summary",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )

                HorizontalDivider()

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Service")
                    Text(
                        text = booking.service?.name ?: "Service",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Date")
                    Text(
                        text = booking.scheduledDate,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Time")
                    Text(
                        text = booking.scheduledTime,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                booking.cleaner?.let { worker ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Worker")
                        Text(
                            text = "${worker.firstName} ${worker.lastName}",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                HorizontalDivider()

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Total",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = formatPrice(booking.totalPrice, booking.currency),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF4CAF50)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        // Payment Button
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Error message
            uiState.error?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }

            // Payment button
            Button(
                onClick = {
                    uiState.paymentIntentClientSecret?.let { onPay(it) }
                },
                enabled = uiState.isPaymentReady && !uiState.isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Icon(
                        Icons.Default.CreditCard,
                        contentDescription = null,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Pay ${formatPrice(booking.totalPrice, booking.currency)}",
                        style = MaterialTheme.typography.titleMedium
                    )
                }
            }

            // Google Pay hint
            Text(
                text = "Google Pay available",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun formatPrice(amount: Float, currency: String): String {
    return try {
        val format = NumberFormat.getCurrencyInstance()
        format.currency = Currency.getInstance(currency)
        format.format(amount)
    } catch (e: Exception) {
        "€${String.format("%.2f", amount)}"
    }
}

// ViewModel
data class PaymentUiState(
    val isLoadingBooking: Boolean = true,
    val booking: BookingApiModel? = null,
    val bookingError: String? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val paymentIntentClientSecret: String? = null,
    val customerConfig: PaymentSheet.CustomerConfiguration? = null,
    val isPaymentReady: Boolean = false,
    val paymentResult: PaymentResult? = null
)

sealed class PaymentResult {
    object Success : PaymentResult()
    data class Failed(val error: String) : PaymentResult()
    object Canceled : PaymentResult()
}

@HiltViewModel
class PaymentViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
    private val paymentRepository: PaymentRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val bookingId: String = checkNotNull(savedStateHandle["bookingId"])

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState: StateFlow<PaymentUiState> = _uiState.asStateFlow()

    init {
        loadBooking()
    }

    fun loadBooking() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingBooking = true, bookingError = null) }

            bookingRepository.getBooking(bookingId)
                .onSuccess { booking ->
                    _uiState.update {
                        it.copy(
                            isLoadingBooking = false,
                            booking = BookingApiModel(
                                id = booking.id,
                                status = booking.status.name,
                                scheduledDate = booking.scheduledDate.toString(),
                                scheduledTime = booking.scheduledTime.toString(),
                                duration = booking.duration,
                                totalPrice = booking.totalPrice.amount.toFloat(),
                                currency = booking.totalPrice.currency,
                                address = booking.address,
                                cleaner = booking.worker,
                                service = booking.service
                            )
                        )
                    }
                    preparePayment()
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoadingBooking = false,
                            bookingError = error.message ?: "Failed to load booking"
                        )
                    }
                }
        }
    }

    private fun preparePayment() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            paymentRepository.createPaymentIntent(bookingId)
                .onSuccess { response ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            paymentIntentClientSecret = response.paymentIntent,
                            customerConfig = PaymentSheet.CustomerConfiguration(
                                id = response.customer,
                                ephemeralKeySecret = response.ephemeralKey
                            ),
                            isPaymentReady = true
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to prepare payment"
                        )
                    }
                }
        }
    }

    fun onPaymentSheetResult(result: PaymentSheetResult) {
        when (result) {
            is PaymentSheetResult.Completed -> {
                _uiState.update { it.copy(paymentResult = PaymentResult.Success) }
            }
            is PaymentSheetResult.Canceled -> {
                _uiState.update { it.copy(paymentResult = PaymentResult.Canceled) }
            }
            is PaymentSheetResult.Failed -> {
                _uiState.update {
                    it.copy(
                        error = result.error.localizedMessage,
                        paymentResult = PaymentResult.Failed(result.error.localizedMessage ?: "Payment failed")
                    )
                }
            }
        }
    }
}
