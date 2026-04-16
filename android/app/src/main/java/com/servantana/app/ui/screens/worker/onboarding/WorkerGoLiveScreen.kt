package com.servantana.app.ui.screens.worker.onboarding

import androidx.compose.animation.core.*
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun WorkerGoLiveScreen(
    viewModel: WorkerOnboardingViewModel,
    onGoLive: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    if (uiState.onboardingSuccess) {
        SuccessView()
    } else {
        ReviewView(
            uiState = uiState,
            viewModel = viewModel,
            onGoLive = onGoLive
        )
    }
}

@Composable
fun ReviewView(
    uiState: OnboardingUiState,
    viewModel: WorkerOnboardingViewModel,
    onGoLive: () -> Unit
) {
    val allRequiredComplete = uiState.profileComplete &&
            uiState.professionsComplete &&
            uiState.availabilityComplete

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // Header
        Icon(
            Icons.Default.Verified,
            contentDescription = null,
            modifier = Modifier.size(60.dp),
            tint = Color(0xFF4CAF50)
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Ready to Go Live!",
            style = MaterialTheme.typography.headlineSmall,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Review your setup below. Once you go live, customers will be able to find and book you.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Setup summary
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                SetupSummaryRow(
                    title = "Profile",
                    subtitle = if (uiState.bio.isEmpty()) "Not set" else "Complete",
                    isComplete = uiState.profileComplete,
                    onClick = { viewModel.goToStep(OnboardingStep.PROFILE) }
                )

                SetupSummaryRow(
                    title = "Services",
                    subtitle = "${uiState.selectedProfessions.size} selected",
                    isComplete = uiState.professionsComplete,
                    onClick = { viewModel.goToStep(OnboardingStep.PROFESSIONS) }
                )

                SetupSummaryRow(
                    title = "Schedule",
                    subtitle = getAvailabilityDescription(uiState),
                    isComplete = uiState.availabilityComplete,
                    onClick = { viewModel.goToStep(OnboardingStep.AVAILABILITY) }
                )

                SetupSummaryRow(
                    title = "Documents",
                    subtitle = getDocumentsDescription(uiState),
                    isComplete = uiState.documentsComplete,
                    onClick = { viewModel.goToStep(OnboardingStep.DOCUMENTS) }
                )

                SetupSummaryRow(
                    title = "Payments",
                    subtitle = if (uiState.stripeComplete) "Connected" else "Not connected",
                    isComplete = uiState.stripeComplete,
                    onClick = { viewModel.goToStep(OnboardingStep.STRIPE_CONNECT) }
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Warnings
        if (!allRequiredComplete) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFFF9800).copy(alpha = 0.1f)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            tint = Color(0xFFFF9800)
                        )
                        Text(
                            text = "Complete required steps",
                            style = MaterialTheme.typography.titleSmall
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (!uiState.profileComplete) {
                        Text(
                            text = "• Complete your profile",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (!uiState.professionsComplete) {
                        Text(
                            text = "• Select at least one service",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (!uiState.availabilityComplete) {
                        Text(
                            text = "• Set your availability",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Optional items notice
        if (allRequiredComplete && (!uiState.documentsComplete || !uiState.stripeComplete)) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Optional but Recommended",
                            style = MaterialTheme.typography.titleSmall
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (!uiState.documentsComplete) {
                        Text(
                            text = "• Upload verification documents to build trust",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    if (!uiState.stripeComplete) {
                        Text(
                            text = "• Connect Stripe to receive payments",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Error message
        uiState.error?.let { error ->
            Text(
                text = error,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        Spacer(modifier = Modifier.weight(1f))

        // Go Live button
        Button(
            onClick = onGoLive,
            modifier = Modifier.fillMaxWidth(),
            enabled = allRequiredComplete && !uiState.isLoading,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF4CAF50)
            )
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Icon(Icons.Default.Bolt, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Go Live")
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
fun SetupSummaryRow(
    title: String,
    subtitle: String,
    isComplete: Boolean,
    onClick: () -> Unit
) {
    TextButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    if (isComplete) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                    contentDescription = null,
                    tint = if (isComplete) Color(0xFF4CAF50) else MaterialTheme.colorScheme.onSurfaceVariant
                )
                Column {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Icon(
                Icons.Default.ChevronRight,
                contentDescription = "Edit",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun SuccessView() {
    var showCheckmark by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (showCheckmark) 1f else 0.5f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "checkmark_scale"
    )

    LaunchedEffect(Unit) {
        showCheckmark = true
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // Animated checkmark
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(120.dp)
                .scale(scale)
                .clip(CircleShape)
                .background(Color(0xFF4CAF50).copy(alpha = 0.1f))
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(100.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF4CAF50).copy(alpha = 0.2f))
            ) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = null,
                    modifier = Modifier.size(50.dp),
                    tint = Color(0xFF4CAF50)
                )
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = "You're Live!",
            style = MaterialTheme.typography.headlineMedium,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = "Congratulations! Your profile is now visible to customers. You'll receive notifications when someone wants to book your services.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Tips
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Tips for Success",
                    style = MaterialTheme.typography.titleMedium
                )

                Spacer(modifier = Modifier.height(12.dp))

                TipRow(icon = Icons.Default.Star, text = "Respond to inquiries quickly")
                TipRow(icon = Icons.Default.CameraAlt, text = "Add photos of your work")
                TipRow(icon = Icons.Default.ThumbUp, text = "Ask happy customers for reviews")
                TipRow(icon = Icons.Default.Schedule, text = "Keep your availability up to date")
            }
        }
    }
}

@Composable
fun TipRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(20.dp)
        )
        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

private fun getAvailabilityDescription(state: OnboardingUiState): String {
    val enabledDays = state.availability.count { it.isEnabled }
    return when {
        enabledDays == 0 -> "Not set"
        enabledDays == 7 -> "Every day"
        else -> "$enabledDays days/week"
    }
}

private fun getDocumentsDescription(state: OnboardingUiState): String {
    val count = state.documents.size
    if (count == 0) return "None uploaded"

    val pending = state.documents.count { it.status == "PENDING" }
    val verified = state.documents.count { it.status == "VERIFIED" }

    return when {
        verified > 0 -> "$verified verified"
        pending > 0 -> "$pending pending review"
        else -> "$count uploaded"
    }
}
