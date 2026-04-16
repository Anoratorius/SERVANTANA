package com.servantana.app.ui.screens.worker.onboarding

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp

@Composable
fun WorkerProfileSetupScreen(
    viewModel: WorkerOnboardingViewModel,
    onNext: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        // Header
        Text(
            text = "Create Your Profile",
            style = MaterialTheme.typography.headlineSmall
        )
        Text(
            text = "Tell customers about yourself and your services",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(24.dp))

        // Personal Information
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Personal Information",
                    style = MaterialTheme.typography.titleMedium
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = uiState.firstName,
                        onValueChange = { viewModel.updateFirstName(it) },
                        label = { Text("First Name") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = uiState.lastName,
                        onValueChange = { viewModel.updateLastName(it) },
                        label = { Text("Last Name") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = uiState.phone,
                    onValueChange = { viewModel.updatePhone(it) },
                    label = { Text("Phone Number") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    singleLine = true
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // About You
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "About You",
                    style = MaterialTheme.typography.titleMedium
                )

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedTextField(
                    value = uiState.bio,
                    onValueChange = { viewModel.updateBio(it) },
                    label = { Text("Bio") },
                    placeholder = { Text("Describe your experience and skills...") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    maxLines = 5
                )

                Text(
                    text = "Describe your experience, skills, and what makes you stand out",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Work Details
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Work Details",
                    style = MaterialTheme.typography.titleMedium
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = uiState.hourlyRate.toString(),
                        onValueChange = { value ->
                            value.toDoubleOrNull()?.let { viewModel.updateHourlyRate(it) }
                        },
                        label = { Text("Hourly Rate (€)") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        suffix = { Text("€/hr") }
                    )

                    OutlinedTextField(
                        value = uiState.experienceYears.toString(),
                        onValueChange = { value ->
                            value.toIntOrNull()?.let { viewModel.updateExperienceYears(it) }
                        },
                        label = { Text("Experience") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        suffix = { Text("years") }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Eco-Friendly Services")
                        Switch(
                            checked = uiState.ecoFriendly,
                            onCheckedChange = { viewModel.updateEcoFriendly(it) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Pet-Friendly")
                    Switch(
                        checked = uiState.petFriendly,
                        onCheckedChange = { viewModel.updatePetFriendly(it) }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Service Area
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Service Area",
                    style = MaterialTheme.typography.titleMedium
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = uiState.city,
                        onValueChange = { viewModel.updateCity(it) },
                        label = { Text("City") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )

                    var expanded by remember { mutableStateOf(false) }
                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = !expanded },
                        modifier = Modifier.weight(1f)
                    ) {
                        OutlinedTextField(
                            value = getCountryName(uiState.country),
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Country") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                            modifier = Modifier.menuAnchor()
                        )
                        ExposedDropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            listOf("DE" to "Germany", "AT" to "Austria", "CH" to "Switzerland").forEach { (code, name) ->
                                DropdownMenuItem(
                                    text = { Text(name) },
                                    onClick = {
                                        viewModel.updateCountry(code)
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Service Radius: ${uiState.serviceRadius} km",
                    style = MaterialTheme.typography.bodyMedium
                )
                Slider(
                    value = uiState.serviceRadius.toFloat(),
                    onValueChange = { viewModel.updateServiceRadius(it.toInt()) },
                    valueRange = 5f..100f,
                    steps = 19
                )
            }
        }

        // Error message
        uiState.error?.let { error ->
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = error,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Continue button
        Button(
            onClick = onNext,
            modifier = Modifier.fillMaxWidth(),
            enabled = isProfileValid(uiState) && !uiState.isLoading
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text("Save & Continue")
                Spacer(modifier = Modifier.width(8.dp))
                Icon(Icons.Default.ArrowForward, "Continue")
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

private fun isProfileValid(state: OnboardingUiState): Boolean {
    return state.firstName.isNotBlank() &&
            state.lastName.isNotBlank() &&
            state.bio.isNotBlank() &&
            state.hourlyRate > 0 &&
            state.city.isNotBlank()
}

private fun getCountryName(code: String): String {
    return when (code) {
        "DE" -> "Germany"
        "AT" -> "Austria"
        "CH" -> "Switzerland"
        "NL" -> "Netherlands"
        "BE" -> "Belgium"
        else -> code
    }
}
