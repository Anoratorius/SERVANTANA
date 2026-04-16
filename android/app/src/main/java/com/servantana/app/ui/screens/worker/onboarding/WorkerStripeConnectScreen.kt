package com.servantana.app.ui.screens.worker.onboarding

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun WorkerStripeConnectScreen(
    viewModel: WorkerOnboardingViewModel,
    onNext: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Refresh Stripe status on resume
    LaunchedEffect(Unit) {
        viewModel.refreshStripeStatus()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // Header icon
        Icon(
            Icons.Default.CreditCard,
            contentDescription = null,
            modifier = Modifier.size(60.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Set Up Payments",
            style = MaterialTheme.typography.headlineSmall,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Connect your bank account to receive payments from bookings. We use Stripe for secure, fast payouts.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Benefits
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                BenefitRow(
                    icon = Icons.Default.Bolt,
                    title = "Fast Payouts",
                    description = "Get paid within 2-3 business days"
                )
                BenefitRow(
                    icon = Icons.Default.Lock,
                    title = "Secure",
                    description = "Bank-level encryption protects your data"
                )
                BenefitRow(
                    icon = Icons.Default.Language,
                    title = "Global Support",
                    description = "Works with banks in 40+ countries"
                )
                BenefitRow(
                    icon = Icons.Default.BarChart,
                    title = "Track Earnings",
                    description = "See your earnings and payout history"
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Current status
        uiState.stripeStatus?.let { status ->
            StripeStatusCard(status = status)
            Spacer(modifier = Modifier.height(24.dp))
        }

        // Error message
        uiState.error?.let { error ->
            Text(
                text = error,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        Spacer(modifier = Modifier.weight(1f))

        // Action buttons
        if (uiState.stripeComplete) {
            Button(
                onClick = onNext,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF4CAF50)
                )
            ) {
                Icon(Icons.Default.CheckCircle, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Continue")
            }
        } else {
            Button(
                onClick = {
                    viewModel.createStripeAccount { url ->
                        // Open Stripe onboarding in browser
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        context.startActivity(intent)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Icon(Icons.Default.Link, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Connect with Stripe")
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            TextButton(onClick = onNext) {
                Text("Skip for Now")
            }

            Text(
                text = "You can set up payments later in Settings",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
fun BenefitRow(
    icon: ImageVector,
    title: String,
    description: String
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(24.dp)
        )
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun StripeStatusCard(
    status: com.servantana.app.data.model.StripeConnectStatus
) {
    val statusColor = when (status.status) {
        "complete" -> Color(0xFF4CAF50)
        "restricted" -> Color(0xFFFF9800)
        "pending" -> Color(0xFFFFC107)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    val statusText = when (status.status) {
        "complete" -> "Connected and Ready"
        "restricted" -> "Additional Info Required"
        "pending" -> "Verification Pending"
        "none" -> "Not Connected"
        else -> "Unknown Status"
    }

    val statusIcon = when (status.status) {
        "complete" -> Icons.Default.CheckCircle
        "restricted" -> Icons.Default.Warning
        "pending" -> Icons.Default.Schedule
        else -> Icons.Default.Help
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = statusColor.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                statusIcon,
                contentDescription = null,
                tint = statusColor,
                modifier = Modifier.size(32.dp)
            )

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Stripe Status",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = statusText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = statusColor
                )
            }
        }
    }
}
