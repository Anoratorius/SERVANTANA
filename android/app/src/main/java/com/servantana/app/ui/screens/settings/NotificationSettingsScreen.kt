package com.servantana.app.ui.screens.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationSettingsScreen(
    onNavigateBack: () -> Unit
) {
    var pushEnabled by remember { mutableStateOf(true) }
    var emailEnabled by remember { mutableStateOf(true) }
    var bookingUpdates by remember { mutableStateOf(true) }
    var messageNotifications by remember { mutableStateOf(true) }
    var promotions by remember { mutableStateOf(false) }
    var reminders by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications") },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
        ) {
            // General
            NotificationSection(title = "General") {
                NotificationToggle(
                    title = "Push Notifications",
                    subtitle = "Receive notifications on your device",
                    checked = pushEnabled,
                    onCheckedChange = { pushEnabled = it }
                )
                NotificationToggle(
                    title = "Email Notifications",
                    subtitle = "Receive notifications via email",
                    checked = emailEnabled,
                    onCheckedChange = { emailEnabled = it }
                )
            }

            // Activity
            NotificationSection(title = "Activity") {
                NotificationToggle(
                    title = "Booking Updates",
                    subtitle = "Status changes, confirmations, cancellations",
                    checked = bookingUpdates,
                    onCheckedChange = { bookingUpdates = it }
                )
                NotificationToggle(
                    title = "Messages",
                    subtitle = "New messages from workers",
                    checked = messageNotifications,
                    onCheckedChange = { messageNotifications = it }
                )
                NotificationToggle(
                    title = "Reminders",
                    subtitle = "Upcoming booking reminders",
                    checked = reminders,
                    onCheckedChange = { reminders = it }
                )
            }

            // Marketing
            NotificationSection(title = "Marketing") {
                NotificationToggle(
                    title = "Promotions & Offers",
                    subtitle = "Special deals and discounts",
                    checked = promotions,
                    onCheckedChange = { promotions = it }
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun NotificationSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Column {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )
        content()
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
    }
}

@Composable
private fun NotificationToggle(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}
