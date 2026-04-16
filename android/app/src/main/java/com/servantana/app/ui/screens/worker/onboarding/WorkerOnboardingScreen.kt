package com.servantana.app.ui.screens.worker.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkerOnboardingScreen(
    viewModel: WorkerOnboardingViewModel = hiltViewModel(),
    onSignOut: () -> Unit,
    onComplete: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.onboardingSuccess) {
        if (uiState.onboardingSuccess) {
            onComplete()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Become a Service Pro") },
                navigationIcon = {
                    if (uiState.currentStep != OnboardingStep.PROFILE) {
                        IconButton(onClick = { viewModel.previousStep() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                        }
                    }
                },
                actions = {
                    TextButton(onClick = onSignOut) {
                        Text("Sign Out", color = MaterialTheme.colorScheme.error)
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
            // Progress indicator
            OnboardingProgressIndicator(
                currentStep = uiState.currentStep,
                modifier = Modifier.padding(16.dp)
            )

            // Step content
            AnimatedContent(
                targetState = uiState.currentStep,
                label = "onboarding_step",
                modifier = Modifier.fillMaxSize()
            ) { step ->
                when (step) {
                    OnboardingStep.PROFILE -> WorkerProfileSetupScreen(
                        viewModel = viewModel,
                        onNext = { viewModel.saveProfile { viewModel.nextStep() } }
                    )
                    OnboardingStep.PROFESSIONS -> WorkerProfessionsScreen(
                        viewModel = viewModel,
                        onNext = { viewModel.saveProfessions { viewModel.nextStep() } }
                    )
                    OnboardingStep.AVAILABILITY -> WorkerAvailabilityScreen(
                        viewModel = viewModel,
                        onNext = { viewModel.saveAvailability { viewModel.nextStep() } }
                    )
                    OnboardingStep.DOCUMENTS -> WorkerDocumentsScreen(
                        viewModel = viewModel,
                        onNext = { viewModel.nextStep() }
                    )
                    OnboardingStep.STRIPE_CONNECT -> WorkerStripeConnectScreen(
                        viewModel = viewModel,
                        onNext = { viewModel.nextStep() }
                    )
                    OnboardingStep.GO_LIVE -> WorkerGoLiveScreen(
                        viewModel = viewModel,
                        onGoLive = { viewModel.completeOnboarding { /* onComplete handled by LaunchedEffect */ } }
                    )
                }
            }
        }
    }
}

@Composable
fun OnboardingProgressIndicator(
    currentStep: OnboardingStep,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        OnboardingStep.entries.forEachIndexed { index, step ->
            val isComplete = step.ordinal < currentStep.ordinal
            val isCurrent = step == currentStep

            StepIndicator(
                step = step,
                isComplete = isComplete,
                isCurrent = isCurrent,
                modifier = Modifier.weight(1f)
            )

            if (index < OnboardingStep.entries.size - 1) {
                Box(
                    modifier = Modifier
                        .width(20.dp)
                        .height(2.dp)
                        .background(
                            if (isComplete) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surfaceVariant
                        )
                )
            }
        }
    }
}

@Composable
fun StepIndicator(
    step: OnboardingStep,
    isComplete: Boolean,
    isCurrent: Boolean,
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(32.dp)
                .clip(CircleShape)
                .background(
                    when {
                        isComplete -> MaterialTheme.colorScheme.primary
                        isCurrent -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    }
                )
        ) {
            if (isComplete) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = "Complete",
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(16.dp)
                )
            } else {
                Icon(
                    getStepIcon(step),
                    contentDescription = step.title,
                    tint = if (isCurrent) MaterialTheme.colorScheme.onPrimary
                          else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(16.dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = step.title,
            style = MaterialTheme.typography.labelSmall,
            color = if (isCurrent) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1
        )
    }
}

fun getStepIcon(step: OnboardingStep): ImageVector {
    return when (step) {
        OnboardingStep.PROFILE -> Icons.Default.Person
        OnboardingStep.PROFESSIONS -> Icons.Default.Work
        OnboardingStep.AVAILABILITY -> Icons.Default.Schedule
        OnboardingStep.DOCUMENTS -> Icons.Default.Description
        OnboardingStep.STRIPE_CONNECT -> Icons.Default.CreditCard
        OnboardingStep.GO_LIVE -> Icons.Default.Verified
    }
}
