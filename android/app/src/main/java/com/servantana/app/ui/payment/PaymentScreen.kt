package com.servantana.app.ui.payment

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servantana.app.data.model.Booking
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.rememberPaymentSheet
import java.text.NumberFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentScreen(
    booking: Booking,
    onNavigateBack: () -> Unit,
    onPaymentSuccess: () -> Unit,
    viewModel: PaymentViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    val paymentSheet = rememberPaymentSheet { result ->
        viewModel.onPaymentSheetResult(result)
    }

    // Prepare payment when screen loads
    LaunchedEffect(booking.id) {
        viewModel.preparePayment(booking.id)
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Booking Summary
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
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
                            text = booking.service.name,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Date")
                        Text(
                            text = booking.scheduledDate.toString(),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Time")
                        Text(
                            text = booking.scheduledTime.toString(),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
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
                            text = formatPrice(booking.totalPrice.amount, booking.totalPrice.currency),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
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
                        uiState.paymentIntentClientSecret?.let { clientSecret ->
                            val configuration = PaymentSheet.Configuration(
                                merchantDisplayName = "Servantana",
                                customer = uiState.customerConfig,
                                googlePay = PaymentSheet.GooglePayConfiguration(
                                    environment = PaymentSheet.GooglePayConfiguration.Environment.Test,
                                    countryCode = "DE",
                                    currencyCode = booking.totalPrice.currency
                                )
                            )
                            paymentSheet.presentWithPaymentIntent(
                                clientSecret,
                                configuration
                            )
                        }
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
                            text = "Pay ${formatPrice(booking.totalPrice.amount, booking.totalPrice.currency)}",
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
}

private fun formatPrice(amount: Float, currency: String): String {
    val format = NumberFormat.getCurrencyInstance()
    format.currency = Currency.getInstance(currency)
    return format.format(amount)
}
