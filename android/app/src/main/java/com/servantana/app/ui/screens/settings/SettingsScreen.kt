package com.servantana.app.ui.screens.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onNavigateToSecurity: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    var showLogoutDialog by remember { mutableStateOf(false) }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showThemeDialog by remember { mutableStateOf(false) }
    var showAboutDialog by remember { mutableStateOf(false) }

    var selectedLanguage by remember { mutableStateOf("en") }
    var selectedTheme by remember { mutableStateOf("system") }

    // Logout Dialog
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Logout") },
            text = { Text("Are you sure you want to logout?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showLogoutDialog = false
                        onLogout()
                    }
                ) {
                    Text("Logout")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Language Dialog
    if (showLanguageDialog) {
        LanguagePickerDialog(
            selectedLanguage = selectedLanguage,
            onLanguageSelected = {
                selectedLanguage = it
                showLanguageDialog = false
            },
            onDismiss = { showLanguageDialog = false }
        )
    }

    // Theme Dialog
    if (showThemeDialog) {
        ThemePickerDialog(
            selectedTheme = selectedTheme,
            onThemeSelected = {
                selectedTheme = it
                showThemeDialog = false
            },
            onDismiss = { showThemeDialog = false }
        )
    }

    // About Dialog
    if (showAboutDialog) {
        AboutDialog(onDismiss = { showAboutDialog = false })
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
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
            // Account Section
            SettingsSection(title = "Account") {
                SettingsItem(
                    icon = Icons.Filled.Notifications,
                    title = "Notifications",
                    subtitle = "Manage notification preferences",
                    onClick = onNavigateToNotifications
                )
                SettingsItem(
                    icon = Icons.Filled.Lock,
                    title = "Security",
                    subtitle = "Password and authentication",
                    onClick = onNavigateToSecurity
                )
            }

            // Preferences Section
            SettingsSection(title = "Preferences") {
                SettingsItem(
                    icon = Icons.Filled.Language,
                    title = "Language",
                    subtitle = getLanguageDisplayName(selectedLanguage),
                    onClick = { showLanguageDialog = true }
                )
                SettingsItem(
                    icon = Icons.Filled.Palette,
                    title = "Theme",
                    subtitle = getThemeDisplayName(selectedTheme),
                    onClick = { showThemeDialog = true }
                )
            }

            // Support Section
            SettingsSection(title = "Support") {
                SettingsItem(
                    icon = Icons.Filled.Help,
                    title = "Help Center",
                    subtitle = "FAQs and support articles",
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://servantana.com/help"))
                        context.startActivity(intent)
                    }
                )
                SettingsItem(
                    icon = Icons.Filled.Email,
                    title = "Contact Support",
                    subtitle = "Get help from our team",
                    onClick = {
                        val intent = Intent(Intent.ACTION_SENDTO).apply {
                            data = Uri.parse("mailto:support@servantana.com")
                            putExtra(Intent.EXTRA_SUBJECT, "Support Request - Servantana App")
                        }
                        context.startActivity(intent)
                    }
                )
                SettingsItem(
                    icon = Icons.Filled.Info,
                    title = "About",
                    subtitle = "Version 1.0.0",
                    onClick = { showAboutDialog = true }
                )
            }

            // Legal Section
            SettingsSection(title = "Legal") {
                SettingsItem(
                    icon = Icons.Filled.Description,
                    title = "Terms of Service",
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://servantana.com/terms"))
                        context.startActivity(intent)
                    }
                )
                SettingsItem(
                    icon = Icons.Filled.PrivacyTip,
                    title = "Privacy Policy",
                    onClick = {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://servantana.com/privacy"))
                        context.startActivity(intent)
                    }
                )
            }

            // Logout
            Spacer(modifier = Modifier.height(16.dp))
            SettingsItem(
                icon = Icons.Filled.Logout,
                title = "Logout",
                titleColor = MaterialTheme.colorScheme.error,
                onClick = { showLogoutDialog = true }
            )
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun LanguagePickerDialog(
    selectedLanguage: String,
    onLanguageSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val languages = listOf(
        "en" to "English",
        "de" to "Deutsch",
        "es" to "Español",
        "fr" to "Français",
        "ka" to "ქართული"
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Select Language") },
        text = {
            Column {
                languages.forEach { (code, name) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onLanguageSelected(code) }
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedLanguage == code,
                            onClick = { onLanguageSelected(code) }
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = name)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun ThemePickerDialog(
    selectedTheme: String,
    onThemeSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val themes = listOf(
        "system" to "System Default" to Icons.Filled.BrightnessAuto,
        "light" to "Light" to Icons.Filled.LightMode,
        "dark" to "Dark" to Icons.Filled.DarkMode
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Select Theme") },
        text = {
            Column {
                themes.forEach { (codeAndName, icon) ->
                    val (code, name) = codeAndName
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onThemeSelected(code) }
                            .padding(vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RadioButton(
                            selected = selectedTheme == code,
                            onClick = { onThemeSelected(code) }
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(text = name)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun AboutDialog(onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = Icons.Filled.Home,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text("Servantana")
            }
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Version 1.0.0",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Find and book professional home services with AI-powered matching",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "© 2024 Servantana",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}

@Composable
private fun SettingsSection(
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
private fun SettingsItem(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    titleColor: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = if (titleColor == MaterialTheme.colorScheme.error)
                MaterialTheme.colorScheme.error
            else
                MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyLarge,
                color = titleColor
            )
            subtitle?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        if (titleColor != MaterialTheme.colorScheme.error) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun getLanguageDisplayName(code: String): String {
    return when (code) {
        "en" -> "English"
        "de" -> "Deutsch"
        "es" -> "Español"
        "fr" -> "Français"
        "ka" -> "ქართული"
        else -> "English"
    }
}

private fun getThemeDisplayName(theme: String): String {
    return when (theme) {
        "light" -> "Light"
        "dark" -> "Dark"
        else -> "System Default"
    }
}
