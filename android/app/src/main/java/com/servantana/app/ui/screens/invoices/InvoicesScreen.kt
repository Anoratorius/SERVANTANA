package com.servantana.app.ui.screens.invoices

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import java.time.format.DateTimeFormatter

data class Invoice(
    val id: String,
    val invoiceNumber: String,
    val date: LocalDate,
    val dueDate: LocalDate,
    val amount: Double,
    val currency: String = "EUR",
    val status: InvoiceStatus,
    val serviceName: String,
    val workerName: String
)

enum class InvoiceStatus {
    PAID,
    PENDING,
    OVERDUE,
    CANCELLED
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoicesScreen(
    onNavigateBack: () -> Unit,
    onNavigateToInvoice: (String) -> Unit
) {
    var selectedFilter by remember { mutableStateOf<InvoiceStatus?>(null) }

    // Mock data
    val invoices = remember {
        listOf(
            Invoice(
                id = "1",
                invoiceNumber = "INV-2026-001",
                date = LocalDate.now().minusDays(5),
                dueDate = LocalDate.now().plusDays(10),
                amount = 85.00,
                status = InvoiceStatus.PENDING,
                serviceName = "Standard Cleaning",
                workerName = "Maria S."
            ),
            Invoice(
                id = "2",
                invoiceNumber = "INV-2026-002",
                date = LocalDate.now().minusDays(15),
                dueDate = LocalDate.now().minusDays(1),
                amount = 150.00,
                status = InvoiceStatus.PAID,
                serviceName = "Deep Cleaning",
                workerName = "John D."
            ),
            Invoice(
                id = "3",
                invoiceNumber = "INV-2026-003",
                date = LocalDate.now().minusDays(30),
                dueDate = LocalDate.now().minusDays(16),
                amount = 120.00,
                status = InvoiceStatus.PAID,
                serviceName = "Office Cleaning",
                workerName = "Anna K."
            ),
            Invoice(
                id = "4",
                invoiceNumber = "INV-2026-004",
                date = LocalDate.now().minusDays(45),
                dueDate = LocalDate.now().minusDays(31),
                amount = 200.00,
                status = InvoiceStatus.PAID,
                serviceName = "Move-out Cleaning",
                workerName = "Peter M."
            )
        )
    }

    val filteredInvoices = remember(selectedFilter, invoices) {
        if (selectedFilter == null) invoices
        else invoices.filter { it.status == selectedFilter }
    }

    val totalPending = invoices
        .filter { it.status == InvoiceStatus.PENDING }
        .sumOf { it.amount }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Invoices") },
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
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Summary card
            item {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Outstanding Balance",
                                style = MaterialTheme.typography.titleSmall,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Text(
                                text = "${String.format("%.2f", totalPending)} EUR",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                        if (totalPending > 0) {
                            Button(onClick = { /* Pay all */ }) {
                                Text("Pay Now")
                            }
                        }
                    }
                }
            }

            // Filter chips
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    FilterChip(
                        selected = selectedFilter == null,
                        onClick = { selectedFilter = null },
                        label = { Text("All") }
                    )
                    FilterChip(
                        selected = selectedFilter == InvoiceStatus.PENDING,
                        onClick = {
                            selectedFilter = if (selectedFilter == InvoiceStatus.PENDING) null
                            else InvoiceStatus.PENDING
                        },
                        label = { Text("Pending") }
                    )
                    FilterChip(
                        selected = selectedFilter == InvoiceStatus.PAID,
                        onClick = {
                            selectedFilter = if (selectedFilter == InvoiceStatus.PAID) null
                            else InvoiceStatus.PAID
                        },
                        label = { Text("Paid") }
                    )
                }
            }

            // Invoices list
            if (filteredInvoices.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No invoices found",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                items(filteredInvoices, key = { it.id }) { invoice ->
                    InvoiceCard(
                        invoice = invoice,
                        onClick = { onNavigateToInvoice(invoice.id) }
                    )
                }
            }
        }
    }
}

@Composable
private fun InvoiceCard(
    invoice: Invoice,
    onClick: () -> Unit
) {
    val dateFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy")

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column {
                    Text(
                        text = invoice.invoiceNumber,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = invoice.serviceName,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                StatusChip(status = invoice.status)
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "Date",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                    Text(
                        text = invoice.date.format(dateFormatter),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Column {
                    Text(
                        text = "Worker",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                    Text(
                        text = invoice.workerName,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Amount",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                    Text(
                        text = "${String.format("%.2f", invoice.amount)} ${invoice.currency}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusChip(status: InvoiceStatus) {
    val (color, text) = when (status) {
        InvoiceStatus.PAID -> Pair(MaterialTheme.colorScheme.primary, "Paid")
        InvoiceStatus.PENDING -> Pair(MaterialTheme.colorScheme.tertiary, "Pending")
        InvoiceStatus.OVERDUE -> Pair(MaterialTheme.colorScheme.error, "Overdue")
        InvoiceStatus.CANCELLED -> Pair(MaterialTheme.colorScheme.outline, "Cancelled")
    }

    Surface(
        shape = MaterialTheme.shapes.small,
        color = color.copy(alpha = 0.1f)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color
        )
    }
}
