package com.servantana.app.ui.screens.worker

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

data class RouteStop(
    val id: String,
    val address: String,
    val time: String,
    val duration: String,
    val customerName: String,
    val serviceName: String
)

data class OptimizedRoute(
    val stops: List<RouteStop>,
    val totalDistance: String,
    val totalTime: String,
    val savedTime: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RouteOptimizerScreen(
    onNavigateBack: () -> Unit
) {
    var isOptimizing by remember { mutableStateOf(false) }
    var isOptimized by remember { mutableStateOf(false) }

    // Mock data
    val stops = remember {
        listOf(
            RouteStop("1", "123 Main Street", "09:00 AM", "2h", "John D.", "Standard Cleaning"),
            RouteStop("2", "456 Oak Avenue", "11:30 AM", "3h", "Sarah M.", "Deep Cleaning"),
            RouteStop("3", "789 Pine Road", "03:00 PM", "2h", "Mike R.", "Standard Cleaning"),
            RouteStop("4", "321 Elm Street", "05:30 PM", "1.5h", "Lisa K.", "Quick Clean")
        )
    }

    val optimizedRoute = OptimizedRoute(
        stops = stops,
        totalDistance = "24.5 km",
        totalTime = "45 min",
        savedTime = "18 min"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Route Optimizer") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Route summary card
            item {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            RouteStat(
                                icon = Icons.Default.Route,
                                label = "Distance",
                                value = optimizedRoute.totalDistance
                            )
                            RouteStat(
                                icon = Icons.Default.Schedule,
                                label = "Travel Time",
                                value = optimizedRoute.totalTime
                            )
                            if (isOptimized) {
                                RouteStat(
                                    icon = Icons.Default.Timer,
                                    label = "Saved",
                                    value = optimizedRoute.savedTime,
                                    highlight = true
                                )
                            }
                        }
                    }
                }
            }

            // Optimize button
            item {
                Button(
                    onClick = {
                        isOptimizing = true
                        // Simulate optimization
                        isOptimizing = false
                        isOptimized = true
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isOptimizing && !isOptimized
                ) {
                    if (isOptimizing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Optimizing...")
                    } else if (isOptimized) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Route Optimized")
                    } else {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Optimize Route with AI")
                    }
                }
            }

            // Stops header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Today's Stops",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${stops.size} stops",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Stops list
            itemsIndexed(stops) { index, stop ->
                RouteStopCard(
                    stop = stop,
                    stopNumber = index + 1,
                    isFirst = index == 0,
                    isLast = index == stops.lastIndex
                )
            }

            // Open in maps button
            item {
                OutlinedButton(
                    onClick = { /* Open in Google Maps */ },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Map, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Open in Maps")
                }
            }
        }
    }
}

@Composable
private fun RouteStat(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    highlight: Boolean = false
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (highlight)
                MaterialTheme.colorScheme.primary
            else
                MaterialTheme.colorScheme.onPrimaryContainer
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = if (highlight)
                MaterialTheme.colorScheme.primary
            else
                MaterialTheme.colorScheme.onPrimaryContainer
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
        )
    }
}

@Composable
private fun RouteStopCard(
    stop: RouteStop,
    stopNumber: Int,
    isFirst: Boolean,
    isLast: Boolean
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Timeline indicator
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(32.dp)
        ) {
            if (!isFirst) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(8.dp)
                        .padding(bottom = 2.dp)
                ) {}
            }

            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(32.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = "$stopNumber",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(8.dp)
                        .padding(top = 2.dp)
                ) {}
            }
        }

        // Stop details
        Card(modifier = Modifier.weight(1f)) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = stop.time,
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = stop.duration,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = stop.serviceName,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = stop.customerName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = stop.address,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
        }
    }
}
