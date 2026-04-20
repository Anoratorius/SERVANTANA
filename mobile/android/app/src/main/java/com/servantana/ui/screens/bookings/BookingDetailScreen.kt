package com.servantana.ui.screens.bookings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.servantana.R
import com.servantana.data.model.Booking
import com.servantana.ui.Routes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingDetailScreen(
    navController: NavController,
    viewModel: BookingDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCancelDialog by remember { mutableStateOf(false) }

    // Handle cancellation success
    LaunchedEffect(uiState.cancellationSuccess) {
        if (uiState.cancellationSuccess) {
            navController.popBackStack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Booking Details") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                }
            )
        }
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.error != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = uiState.error!!,
                            color = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadBooking() }) {
                            Text(stringResource(R.string.retry))
                        }
                    }
                }
            }
            uiState.booking != null -> {
                val booking = uiState.booking!!

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Status header
                    StatusHeader(booking = booking)

                    // Service info
                    SectionCard(title = "Service") {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.CleaningServices,
                                contentDescription = null,
                                modifier = Modifier.size(24.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(
                                    text = booking.service?.name ?: "Service",
                                    fontWeight = FontWeight.SemiBold
                                )
                                if (booking.duration != null) {
                                    Text(
                                        text = "${booking.duration} hours",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    // Worker info
                    if (booking.cleaner != null) {
                        SectionCard(title = "Professional") {
                            Row(
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(48.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.primaryContainer),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "${booking.cleaner!!.firstName.firstOrNull() ?: ""}${booking.cleaner!!.lastName.firstOrNull() ?: ""}",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = booking.cleaner!!.fullName,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    if (booking.cleaner!!.phone != null) {
                                        Text(
                                            text = booking.cleaner!!.phone!!,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                IconButton(
                                    onClick = {
                                        navController.navigate(
                                            Routes.CONVERSATION.replace("{partnerId}", booking.cleaner!!.id)
                                        )
                                    }
                                ) {
                                    Icon(
                                        Icons.Default.Chat,
                                        contentDescription = "Message",
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    }

                    // Date & Time
                    SectionCard(title = "Date & Time") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.CalendarMonth,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(text = booking.scheduledDate)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.AccessTime,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(text = booking.scheduledTime)
                            }
                        }
                    }

                    // Location
                    SectionCard(title = "Location") {
                        Row(
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                Icons.Default.LocationOn,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(text = booking.address)
                                if (booking.city != null) {
                                    Text(
                                        text = booking.city!!,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }

                    // Notes
                    if (!booking.notes.isNullOrBlank()) {
                        SectionCard(title = "Notes") {
                            Text(text = booking.notes!!)
                        }
                    }

                    // Price breakdown
                    SectionCard(title = "Payment") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = "Total")
                            Text(
                                text = "€${String.format("%.2f", booking.totalPrice)}",
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Action buttons
                    Column(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Track button for in-progress bookings
                        if (booking.isInProgress) {
                            Button(
                                onClick = {
                                    navController.navigate(
                                        Routes.TRACKING.replace("{bookingId}", booking.id)
                                    )
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(
                                    Icons.Default.MyLocation,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(stringResource(R.string.track_worker))
                            }
                        }

                        // Cancel button for pending/confirmed bookings
                        if (booking.isPending || booking.isConfirmed) {
                            OutlinedButton(
                                onClick = { showCancelDialog = true },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = MaterialTheme.colorScheme.error
                                )
                            ) {
                                Icon(
                                    Icons.Default.Cancel,
                                    contentDescription = null,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(stringResource(R.string.cancel_booking))
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
        }
    }

    // Cancel dialog
    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            title = { Text("Cancel Booking?") },
            text = { Text("Are you sure you want to cancel this booking? This action cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showCancelDialog = false
                        viewModel.cancelBooking()
                    },
                    enabled = !uiState.isCancelling
                ) {
                    if (uiState.isCancelling) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Yes, Cancel", color = MaterialTheme.colorScheme.error)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelDialog = false }) {
                    Text("No, Keep It")
                }
            }
        )
    }
}

@Composable
private fun StatusHeader(booking: Booking) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = getStatusColor(booking.status).copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                getStatusIcon(booking.status),
                contentDescription = null,
                tint = getStatusColor(booking.status),
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = getStatusText(booking.status),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = getStatusColor(booking.status)
                )
                Text(
                    text = getStatusDescription(booking.status),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            content()
        }
    }
}

@Composable
private fun getStatusColor(status: String) = when (status) {
    "PENDING" -> MaterialTheme.colorScheme.tertiary
    "CONFIRMED" -> MaterialTheme.colorScheme.primary
    "IN_PROGRESS" -> MaterialTheme.colorScheme.secondary
    "COMPLETED" -> MaterialTheme.colorScheme.primary
    "CANCELLED" -> MaterialTheme.colorScheme.error
    else -> MaterialTheme.colorScheme.onSurfaceVariant
}

private fun getStatusIcon(status: String) = when (status) {
    "PENDING" -> Icons.Default.Schedule
    "CONFIRMED" -> Icons.Default.CheckCircle
    "IN_PROGRESS" -> Icons.Default.DirectionsRun
    "COMPLETED" -> Icons.Default.TaskAlt
    "CANCELLED" -> Icons.Default.Cancel
    else -> Icons.Default.Info
}

private fun getStatusText(status: String) = when (status) {
    "PENDING" -> "Awaiting Confirmation"
    "CONFIRMED" -> "Booking Confirmed"
    "IN_PROGRESS" -> "In Progress"
    "COMPLETED" -> "Completed"
    "CANCELLED" -> "Cancelled"
    else -> status
}

private fun getStatusDescription(status: String) = when (status) {
    "PENDING" -> "Waiting for the professional to confirm"
    "CONFIRMED" -> "Your booking is confirmed and scheduled"
    "IN_PROGRESS" -> "The professional is on their way or working"
    "COMPLETED" -> "Service has been completed"
    "CANCELLED" -> "This booking was cancelled"
    else -> ""
}
