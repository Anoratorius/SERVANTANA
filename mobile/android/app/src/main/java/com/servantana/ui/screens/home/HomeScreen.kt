package com.servantana.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.servantana.R
import com.servantana.data.model.Booking
import com.servantana.data.model.Service
import com.servantana.data.model.Worker
import com.servantana.ui.Routes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    navController: NavController,
    onLogout: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Hello, ${uiState.user?.firstName ?: "there"}",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "Find your service",
                            fontWeight = FontWeight.Bold
                        )
                    }
                },
                actions = {
                    // Notification bell
                    IconButton(onClick = { /* TODO: Notifications */ }) {
                        Icon(
                            Icons.Outlined.Notifications,
                            contentDescription = "Notifications"
                        )
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar {
                BottomNavItem.entries.forEachIndexed { index, item ->
                    NavigationBarItem(
                        icon = {
                            BadgedBox(
                                badge = {
                                    if (item == BottomNavItem.Messages && uiState.unreadMessageCount > 0) {
                                        Badge { Text(uiState.unreadMessageCount.toString()) }
                                    }
                                }
                            ) {
                                Icon(
                                    if (selectedTab == index) item.selectedIcon else item.icon,
                                    contentDescription = item.label
                                )
                            }
                        },
                        label = { Text(item.label) },
                        selected = selectedTab == index,
                        onClick = {
                            selectedTab = index
                            when (item) {
                                BottomNavItem.Home -> { /* Already here */ }
                                BottomNavItem.Search -> navController.navigate(Routes.SEARCH)
                                BottomNavItem.Bookings -> navController.navigate(Routes.BOOKINGS)
                                BottomNavItem.Messages -> navController.navigate(Routes.MESSAGES)
                                BottomNavItem.Profile -> navController.navigate(Routes.PROFILE)
                            }
                        }
                    )
                }
            }
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isLoading,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                // Search Bar
                SearchBarSection(
                    onClick = { navController.navigate(Routes.SEARCH) }
                )

                // Service Categories
                if (uiState.services.isNotEmpty()) {
                    ServiceCategoriesSection(
                        services = uiState.services,
                        onServiceClick = { serviceId ->
                            navController.navigate("${Routes.SEARCH}?serviceId=$serviceId")
                        }
                    )
                }

                // Upcoming Bookings
                if (uiState.upcomingBookings.isNotEmpty()) {
                    UpcomingBookingsSection(
                        bookings = uiState.upcomingBookings,
                        onBookingClick = { bookingId ->
                            navController.navigate(Routes.BOOKING_DETAIL.replace("{bookingId}", bookingId))
                        },
                        onViewAll = { navController.navigate(Routes.BOOKINGS) }
                    )
                }

                // Featured Workers
                if (uiState.featuredWorkers.isNotEmpty()) {
                    FeaturedWorkersSection(
                        workers = uiState.featuredWorkers,
                        onWorkerClick = { workerId ->
                            navController.navigate(Routes.WORKER_PROFILE.replace("{workerId}", workerId))
                        }
                    )
                }

                // Worker Dashboard Button (for workers)
                if (uiState.user?.isWorker == true) {
                    WorkerDashboardButton(
                        onClick = { navController.navigate(Routes.WORKER_DASHBOARD) }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun SearchBarSection(onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Search,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Search for services...",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ServiceCategoriesSection(
    services: List<Service>,
    onServiceClick: (String) -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(
            text = "Services",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(services) { service ->
                ServiceCard(
                    service = service,
                    onClick = { onServiceClick(service.id) }
                )
            }
        }
    }
}

@Composable
private fun ServiceCard(
    service: Service,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(100.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    getServiceIcon(service.name),
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.size(24.dp)
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = service.name,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun UpcomingBookingsSection(
    bookings: List<Booking>,
    onBookingClick: (String) -> Unit,
    onViewAll: () -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stringResource(R.string.upcoming_bookings),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            TextButton(onClick = onViewAll) {
                Text("View All")
            }
        }

        bookings.forEach { booking ->
            BookingCard(
                booking = booking,
                onClick = { onBookingClick(booking.id) }
            )
        }
    }
}

@Composable
private fun BookingCard(
    booking: Booking,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Status indicator
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(getStatusColor(booking.status).copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    getStatusIcon(booking.status),
                    contentDescription = null,
                    tint = getStatusColor(booking.status),
                    modifier = Modifier.size(24.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = booking.service?.name ?: "Service",
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "${booking.scheduledDate} at ${booking.scheduledTime}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = booking.status.replace("_", " "),
                    style = MaterialTheme.typography.labelSmall,
                    color = getStatusColor(booking.status)
                )
            }

            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun FeaturedWorkersSection(
    workers: List<Worker>,
    onWorkerClick: (String) -> Unit
) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(
            text = "Top Rated Professionals",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(workers) { worker ->
                WorkerCard(
                    worker = worker,
                    onClick = { onWorkerClick(worker.id) }
                )
            }
        }
    }
}

@Composable
private fun WorkerCard(
    worker: Worker,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(160.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Avatar placeholder
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "${worker.firstName.firstOrNull() ?: ""}${worker.lastName.firstOrNull() ?: ""}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = worker.fullName,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            if (worker.rating != null) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.Star,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = String.format("%.1f", worker.rating),
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = " (${worker.reviewCount})",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (worker.verified) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Icon(
                        Icons.Default.Verified,
                        contentDescription = "Verified",
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Verified",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

@Composable
private fun WorkerDashboardButton(onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Dashboard,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                modifier = Modifier.size(32.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.worker_dashboard),
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = "Manage your jobs and earnings",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

// Bottom Navigation
enum class BottomNavItem(
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector
) {
    Home("Home", Icons.Outlined.Home, Icons.Filled.Home),
    Search("Search", Icons.Outlined.Search, Icons.Filled.Search),
    Bookings("Bookings", Icons.Outlined.CalendarMonth, Icons.Filled.CalendarMonth),
    Messages("Messages", Icons.Outlined.Chat, Icons.Filled.Chat),
    Profile("Profile", Icons.Outlined.Person, Icons.Filled.Person)
}

// Helper functions
@Composable
private fun getServiceIcon(name: String): ImageVector {
    return when {
        name.contains("clean", ignoreCase = true) -> Icons.Default.CleaningServices
        name.contains("garden", ignoreCase = true) -> Icons.Default.Yard
        name.contains("plumb", ignoreCase = true) -> Icons.Default.Plumbing
        name.contains("electric", ignoreCase = true) -> Icons.Default.ElectricalServices
        name.contains("paint", ignoreCase = true) -> Icons.Default.FormatPaint
        name.contains("move", ignoreCase = true) || name.contains("deliver", ignoreCase = true) -> Icons.Default.LocalShipping
        name.contains("repair", ignoreCase = true) || name.contains("handyman", ignoreCase = true) -> Icons.Default.Build
        else -> Icons.Default.HomeRepairService
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
