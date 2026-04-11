package com.servantana.app.ui.screens.worker

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.DayOfWeek
import java.time.format.TextStyle
import java.util.Locale

data class DayAvailability(
    val dayOfWeek: DayOfWeek,
    val isEnabled: Boolean,
    val startTime: String,
    val endTime: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkerAvailabilityScreen(
    onNavigateBack: () -> Unit
) {
    var availabilities by remember {
        mutableStateOf(
            DayOfWeek.entries.map { day ->
                DayAvailability(
                    dayOfWeek = day,
                    isEnabled = day != DayOfWeek.SUNDAY,
                    startTime = "09:00",
                    endTime = "17:00"
                )
            }
        )
    }
    var hasChanges by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Availability") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    TextButton(
                        onClick = {
                            isSaving = true
                            // TODO: Save availability
                            isSaving = false
                            hasChanges = false
                        },
                        enabled = hasChanges && !isSaving
                    ) {
                        if (isSaving) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Save")
                        }
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
            item {
                Text(
                    text = "Set your weekly availability",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            itemsIndexed(availabilities) { index, availability ->
                DayAvailabilityCard(
                    availability = availability,
                    onToggle = { enabled ->
                        availabilities = availabilities.toMutableList().apply {
                            set(index, availability.copy(isEnabled = enabled))
                        }
                        hasChanges = true
                    },
                    onStartTimeChange = { time ->
                        availabilities = availabilities.toMutableList().apply {
                            set(index, availability.copy(startTime = time))
                        }
                        hasChanges = true
                    },
                    onEndTimeChange = { time ->
                        availabilities = availabilities.toMutableList().apply {
                            set(index, availability.copy(endTime = time))
                        }
                        hasChanges = true
                    }
                )
            }
        }
    }
}

@Composable
private fun DayAvailabilityCard(
    availability: DayAvailability,
    onToggle: (Boolean) -> Unit,
    onStartTimeChange: (String) -> Unit,
    onEndTimeChange: (String) -> Unit
) {
    Card {
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
                Text(
                    text = availability.dayOfWeek.getDisplayName(TextStyle.FULL, Locale.getDefault()),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                Switch(
                    checked = availability.isEnabled,
                    onCheckedChange = onToggle
                )
            }

            if (availability.isEnabled) {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    TimeSelector(
                        modifier = Modifier.weight(1f),
                        label = "Start",
                        time = availability.startTime,
                        onTimeChange = onStartTimeChange
                    )
                    TimeSelector(
                        modifier = Modifier.weight(1f),
                        label = "End",
                        time = availability.endTime,
                        onTimeChange = onEndTimeChange
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimeSelector(
    modifier: Modifier = Modifier,
    label: String,
    time: String,
    onTimeChange: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val times = listOf(
        "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
        "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
        "18:00", "19:00", "20:00", "21:00", "22:00"
    )

    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = { expanded = it },
        modifier = modifier
    ) {
        OutlinedTextField(
            value = time,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.menuAnchor()
        )
        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            times.forEach { t ->
                DropdownMenuItem(
                    text = { Text(t) },
                    onClick = {
                        onTimeChange(t)
                        expanded = false
                    }
                )
            }
        }
    }
}
