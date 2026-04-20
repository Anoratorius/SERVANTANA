package com.servantana.ui.screens.bookings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
fun BookingsScreen(
    navController: NavController,
    viewModel: BookingsViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.bookings)) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = stringResource(R.string.back))
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Tab Row
            TabRow(
                selectedTabIndex = uiState.selectedTab.ordinal,
                modifier = Modifier.fillMaxWidth()
            ) {
                Tab(
                    selected = uiState.selectedTab == BookingTab.UPCOMING,
                    onClick = { viewModel.selectTab(BookingTab.UPCOMING) },
                    text = { Text(stringResource(R.string.upcoming_bookings)) }
                )
                Tab(
                    selected = uiState.selectedTab == BookingTab.PAST,
                    onClick = { viewModel.selectTab(BookingTab.PAST) },
                    text = { Text(stringResource(R.string.past_bookings)) }
                )
            }

            PullToRefreshBox(
                isRefreshing = uiState.isLoading,
                onRefresh = { viewModel.refresh() },
                modifier = Modifier.fillMaxSize()
            ) {
                val bookings = when (uiState.selectedTab) {
                    BookingTab.UPCOMING -> uiState.upcomingBookings
                    BookingTab.PAST -> uiState.pastBookings
                }

                if (uiState.error != null) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = uiState.error!!,
                                color = MaterialTheme.colorScheme.error
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = { viewModel.refresh() }) {
                                Text(stringResource(R.string.retry))
                            }
                        }
                    }
                } else if (bookings.isEmpty() && !uiState.isLoading) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(32.dp)
                        ) {
                            Icon(
                                Icons.Default.CalendarMonth,
                                contentDescription = null,
                                modifier = Modifier.size(64.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = if (uiState.selectedTab == BookingTab.UPCOMING)
                                    "No upcoming bookings"
                                else
                                    "No past bookings",
                                style = MaterialTheme.typography.titleMedium
                            )
                            if (uiState.selectedTab == BookingTab.UPCOMING) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(
                                    onClick = { navController.navigate(Routes.SEARCH) }
                                ) {
                                    Text("Find a Professional")
                                }
                            }
                        }
                    }
                } else {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(bookings) { booking ->
                            BookingListCard(
                                booking = booking,
                                onClick = {
                                    navController.navigate(
                                        Routes.BOOKING_DETAIL.replace("{bookingId}", booking.id)
                                    )
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BookingListCard(
    booking: Booking,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Service name
                Text(
                    text = booking.service?.name ?: "Service",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )

                // Status badge
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = getStatusColor(booking.status).copy(alpha = 0.1f)
                ) {
                    Text(
                        text = booking.status.replace("_", " "),
                        style = MaterialTheme.typography.labelSmall,
                        color = getStatusColor(booking.status),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Worker info
            if (booking.cleaner != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primaryContainer),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${booking.cleaner!!.firstName.firstOrNull() ?: ""}${booking.cleaner!!.lastName.firstOrNull() ?: ""}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = booking.cleaner!!.fullName,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Date and time
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.CalendarMonth,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = booking.scheduledDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(16.dp))
                Icon(
                    Icons.Default.AccessTime,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = booking.scheduledTime,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Address
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.LocationOn,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = booking.address,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Price and action
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "€${String.format("%.2f", booking.totalPrice)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                if (booking.isInProgress) {
                    FilledTonalButton(
                        onClick = onClick
                    ) {
                        Icon(
                            Icons.Default.MyLocation,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Track")
                    }
                } else {
                    TextButton(onClick = onClick) {
                        Text("Details")
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
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
