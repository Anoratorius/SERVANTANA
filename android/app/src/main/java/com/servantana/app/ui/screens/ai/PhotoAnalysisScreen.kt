package com.servantana.app.ui.screens.ai

import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.os.Build
import android.provider.MediaStore
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.servantana.app.data.model.BeforeAfterComparison
import com.servantana.app.data.model.PhotoSummary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhotoAnalysisScreen(
    onNavigateBack: () -> Unit,
    viewModel: PhotoAnalysisViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(
            maxItems = if (state.analysisMode == AnalysisMode.BEFORE_AFTER) 2 else 5
        )
    ) { uris ->
        uris.forEach { uri ->
            try {
                val bitmap = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri))
                } else {
                    @Suppress("DEPRECATION")
                    MediaStore.Images.Media.getBitmap(context.contentResolver, uri)
                }
                viewModel.addImage(bitmap)
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Photo Analysis") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
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
            // Mode selector
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = state.analysisMode == AnalysisMode.SINGLE,
                    onClick = { viewModel.setAnalysisMode(AnalysisMode.SINGLE) },
                    label = { Text("Single Photo") },
                    modifier = Modifier.weight(1f)
                )
                FilterChip(
                    selected = state.analysisMode == AnalysisMode.BEFORE_AFTER,
                    onClick = { viewModel.setAnalysisMode(AnalysisMode.BEFORE_AFTER) },
                    label = { Text("Before & After") },
                    modifier = Modifier.weight(1f)
                )
            }

            // Photo selection section
            if (state.selectedImages.isEmpty()) {
                PhotoSelectionPlaceholder(
                    mode = state.analysisMode,
                    onClick = {
                        photoPickerLauncher.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                        )
                    }
                )
            } else {
                SelectedPhotosRow(
                    images = state.selectedImages,
                    mode = state.analysisMode,
                    onRemove = { viewModel.removeImage(it) },
                    onAdd = {
                        photoPickerLauncher.launch(
                            PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                        )
                    },
                    maxImages = if (state.analysisMode == AnalysisMode.BEFORE_AFTER) 2 else 5
                )
            }

            // Analyze button
            if (state.selectedImages.isNotEmpty()) {
                Button(
                    onClick = { viewModel.analyzePhotos() },
                    enabled = !state.isAnalyzing,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    if (state.isAnalyzing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Analyzing...")
                    } else {
                        Icon(Icons.Default.AutoAwesome, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Analyze Photos")
                    }
                }
            }

            // Error message
            state.error?.let { error ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)
                ) {
                    Text(
                        text = error,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }

            // Results
            state.summary?.let { summary ->
                AnalysisSummaryCard(summary = summary)
            }

            state.comparison?.let { comparison ->
                ComparisonResultCard(comparison = comparison)
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun PhotoSelectionPlaceholder(
    mode: AnalysisMode,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.CameraAlt,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = if (mode == AnalysisMode.BEFORE_AFTER) {
                    "Select Before & After Photos"
                } else {
                    "Select Photos to Analyze"
                },
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = if (mode == AnalysisMode.BEFORE_AFTER) {
                    "Select 2 photos"
                } else {
                    "Select up to 5 photos"
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun SelectedPhotosRow(
    images: List<Bitmap>,
    mode: AnalysisMode,
    onRemove: (Int) -> Unit,
    onAdd: () -> Unit,
    maxImages: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        images.forEachIndexed { index, bitmap ->
            Box {
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = "Selected photo ${index + 1}",
                    modifier = Modifier
                        .size(120.dp)
                        .clip(RoundedCornerShape(12.dp)),
                    contentScale = ContentScale.Crop
                )

                // Label for before/after
                if (mode == AnalysisMode.BEFORE_AFTER) {
                    Surface(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(4.dp),
                        color = if (index == 0) Color(0xFFFF9800) else Color(0xFF4CAF50),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = if (index == 0) "Before" else "After",
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White
                        )
                    }
                }

                // Remove button
                IconButton(
                    onClick = { onRemove(index) },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 8.dp, y = (-8).dp)
                        .size(24.dp)
                        .background(Color.Red, CircleShape)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Remove",
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        // Add more button
        if (images.size < maxImages) {
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .border(
                        2.dp,
                        MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                        RoundedCornerShape(12.dp)
                    )
                    .clickable(onClick = onAdd),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = "Add photo",
                    modifier = Modifier.size(32.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun AnalysisSummaryCard(summary: PhotoSummary) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Analysis Results",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Score cards
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                ScoreItem(
                    value = String.format("%.1f", summary.averageCleanlinessScore),
                    label = "Cleanliness"
                )
                ScoreItem(
                    value = summary.overallCondition.replaceFirstChar { it.uppercase() },
                    label = "Condition",
                    valueColor = conditionColor(summary.overallCondition)
                )
                ScoreItem(
                    value = "${summary.totalEstimatedTime} min",
                    label = "Est. Time"
                )
            }

            // Concerns
            if (summary.allConcerns.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                IssuesList(
                    title = "Areas of Concern",
                    items = summary.allConcerns,
                    icon = Icons.Default.Warning,
                    iconColor = Color(0xFFFF9800)
                )
            }

            // Positives
            if (summary.allPositives.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                IssuesList(
                    title = "Positive Aspects",
                    items = summary.allPositives,
                    icon = Icons.Default.CheckCircle,
                    iconColor = Color(0xFF4CAF50)
                )
            }
        }
    }
}

@Composable
private fun ComparisonResultCard(comparison: BeforeAfterComparison) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Comparison Results",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Improvement score
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "${comparison.improvementScore}%",
                    style = MaterialTheme.typography.displayMedium,
                    fontWeight = FontWeight.Bold,
                    color = when {
                        comparison.improvementScore >= 70 -> Color(0xFF4CAF50)
                        comparison.improvementScore >= 40 -> Color(0xFFFF9800)
                        else -> Color(0xFFF44336)
                    }
                )
                Text(
                    text = "Improvement",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(32.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${comparison.beforeScore}/10",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Before",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Icon(
                        imageVector = Icons.Default.ArrowForward,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${comparison.afterScore}/10",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "After",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Quality verification
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = if (comparison.qualityVerified) {
                    Color(0xFF4CAF50).copy(alpha = 0.1f)
                } else {
                    Color(0xFFF44336).copy(alpha = 0.1f)
                },
                shape = RoundedCornerShape(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (comparison.qualityVerified) {
                            Icons.Default.VerifiedUser
                        } else {
                            Icons.Default.Cancel
                        },
                        contentDescription = null,
                        tint = if (comparison.qualityVerified) Color(0xFF4CAF50) else Color(0xFFF44336)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (comparison.qualityVerified) "Quality Verified" else "Quality Not Verified",
                        fontWeight = FontWeight.Medium
                    )
                }
            }

            // Verification notes
            if (comparison.verificationNotes.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = comparison.verificationNotes,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Improvements
            if (comparison.improvements.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                IssuesList(
                    title = "Improvements Made",
                    items = comparison.improvements,
                    icon = Icons.Default.TrendingUp,
                    iconColor = Color(0xFF4CAF50)
                )
            }

            // Remaining issues
            if (comparison.remainingIssues.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                IssuesList(
                    title = "Remaining Issues",
                    items = comparison.remainingIssues,
                    icon = Icons.Default.Error,
                    iconColor = Color(0xFFFF9800)
                )
            }
        }
    }
}

@Composable
private fun ScoreItem(
    value: String,
    label: String,
    valueColor: Color = MaterialTheme.colorScheme.onSurface
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = valueColor
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun IssuesList(
    title: String,
    items: List<String>,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconColor: Color
) {
    Column {
        Text(
            text = title,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.height(8.dp))
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = RoundedCornerShape(8.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                items.forEach { item ->
                    Row(
                        modifier = Modifier.padding(vertical = 4.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp),
                            tint = iconColor
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = item,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}

private fun conditionColor(condition: String): Color {
    return when (condition.lowercase()) {
        "excellent" -> Color(0xFF4CAF50)
        "good" -> Color(0xFF2196F3)
        "fair" -> Color(0xFFFF9800)
        "poor" -> Color(0xFFF44336)
        else -> Color.Gray
    }
}
