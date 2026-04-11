package com.servantana.app.ui.screens.worker

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class EarningEntry(
    val id: String,
    val date: LocalDate,
    val description: String,
    val amount: Double,
    val status: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkerEarningsScreen(
    onNavigateBack: () -> Unit
) {
    var selectedPeriod by remember { mutableStateOf("Week") }

    // Mock data
    val earnings = remember {
        listOf(
            EarningEntry("1", LocalDate.now(), "Standard Cleaning", 85.00, "Completed"),
            EarningEntry("2", LocalDate.now().minusDays(1), "Deep Cleaning", 150.00, "Completed"),
            EarningEntry("3", LocalDate.now().minusDays(2), "Office Cleaning", 120.00, "Completed"),
            EarningEntry("4", LocalDate.now().minusDays(3), "Standard Cleaning", 75.00, "Pending"),
            EarningEntry("5", LocalDate.now().minusDays(4), "Move-out Cleaning", 200.00, "Completed")
        )
    }

    val totalEarnings = earnings.sumOf { it.amount }
    val pendingEarnings = earnings.filter { it.status == "Pending" }.sumOf { it.amount }
    val completedEarnings = earnings.filter { it.status == "Completed" }.sumOf { it.amount }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Earnings") },
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
            // Total earnings card
            item {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.TrendingUp,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Total Earnings",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                        Text(
                            text = "$${String.format("%.2f", totalEarnings)}",
                            style = MaterialTheme.typography.headlineLarge,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }

            // Period selector
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("Week", "Month", "Year").forEach { period ->
                        FilterChip(
                            selected = selectedPeriod == period,
                            onClick = { selectedPeriod = period },
                            label = { Text(period) },
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // Stats row
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    EarningsStatCard(
                        modifier = Modifier.weight(1f),
                        title = "Completed",
                        amount = completedEarnings,
                        color = MaterialTheme.colorScheme.primary
                    )
                    EarningsStatCard(
                        modifier = Modifier.weight(1f),
                        title = "Pending",
                        amount = pendingEarnings,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                }
            }

            // Transactions header
            item {
                Text(
                    text = "Recent Transactions",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // Transactions list
            items(earnings) { earning ->
                EarningItemCard(earning = earning)
            }
        }
    }
}

@Composable
private fun EarningsStatCard(
    modifier: Modifier = Modifier,
    title: String,
    amount: Double,
    color: androidx.compose.ui.graphics.Color
) {
    Card(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "$${String.format("%.2f", amount)}",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
private fun EarningItemCard(earning: EarningEntry) {
    val dateFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy")

    Card {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = earning.description,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = earning.date.format(dateFormatter),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "+$${String.format("%.2f", earning.amount)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = earning.status,
                    style = MaterialTheme.typography.bodySmall,
                    color = if (earning.status == "Completed")
                        MaterialTheme.colorScheme.primary
                    else
                        MaterialTheme.colorScheme.tertiary
                )
            }
        }
    }
}
