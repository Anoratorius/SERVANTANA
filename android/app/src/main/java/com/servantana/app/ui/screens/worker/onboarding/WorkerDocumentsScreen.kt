package com.servantana.app.ui.screens.worker.onboarding

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.servantana.app.data.model.DocumentType
import com.servantana.app.data.model.WorkerDocument
import java.io.File

@Composable
fun WorkerDocumentsScreen(
    viewModel: WorkerOnboardingViewModel,
    onNext: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var selectedDocumentType by remember { mutableStateOf<DocumentType?>(null) }

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { imageUri ->
            selectedDocumentType?.let { docType ->
                // Copy the file to cache directory
                context.contentResolver.openInputStream(imageUri)?.use { inputStream ->
                    val file = File(context.cacheDir, "document_${System.currentTimeMillis()}.jpg")
                    file.outputStream().use { outputStream ->
                        inputStream.copyTo(outputStream)
                    }
                    viewModel.uploadDocument(file, "image/jpeg", docType) {
                        selectedDocumentType = null
                    }
                }
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize()
    ) {
        // Header
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Upload Documents",
                style = MaterialTheme.typography.headlineSmall
            )
            Text(
                text = "Verify your identity to build trust with customers. All documents are securely stored.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        // Required notice
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            shape = RoundedCornerShape(8.dp),
            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
        ) {
            Row(
                modifier = Modifier.padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Info,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Upload at least one form of ID (Government ID, Driver's License, or Passport)",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        HorizontalDivider()

        // Document types list
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(DocumentType.entries) { type ->
                val uploadedDoc = uiState.documents.find { it.type == type.value }
                DocumentTypeItem(
                    type = type,
                    uploadedDocument = uploadedDoc,
                    isUploading = uiState.isUploadingDocument && selectedDocumentType == type,
                    onUpload = {
                        selectedDocumentType = type
                        imagePicker.launch("image/*")
                    }
                )
            }
        }

        // Error message
        uiState.error?.let { error ->
            Text(
                text = error,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        // Continue button
        val hasRequiredDoc = uiState.documents.any { doc ->
            (doc.type == "GOVERNMENT_ID" || doc.type == "DRIVERS_LICENSE" || doc.type == "PASSPORT") &&
                    (doc.status == "PENDING" || doc.status == "VERIFIED")
        }

        Button(
            onClick = onNext,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = if (hasRequiredDoc) ButtonDefaults.buttonColors()
            else ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
        ) {
            Text(if (hasRequiredDoc) "Continue" else "Skip for Now")
            Spacer(modifier = Modifier.width(8.dp))
            Icon(Icons.Default.ArrowForward, "Continue")
        }
    }
}

@Composable
fun DocumentTypeItem(
    type: DocumentType,
    uploadedDocument: WorkerDocument?,
    isUploading: Boolean,
    onUpload: () -> Unit
) {
    val statusColor = when (uploadedDocument?.status) {
        "VERIFIED" -> Color(0xFF4CAF50)
        "PENDING" -> Color(0xFFFF9800)
        "REJECTED" -> Color(0xFFF44336)
        "EXPIRED" -> Color(0xFFFFC107)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = if (uploadedDocument != null)
            statusColor.copy(alpha = 0.1f)
        else MaterialTheme.colorScheme.surfaceVariant
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Icon
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(statusColor.copy(alpha = 0.2f))
            ) {
                if (isUploading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        when (uploadedDocument?.status) {
                            "VERIFIED" -> Icons.Default.CheckCircle
                            "PENDING" -> Icons.Default.Schedule
                            "REJECTED" -> Icons.Default.Cancel
                            "EXPIRED" -> Icons.Default.Warning
                            else -> Icons.Default.AddCircle
                        },
                        contentDescription = null,
                        tint = statusColor
                    )
                }
            }

            // Info
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = type.displayName,
                        style = MaterialTheme.typography.bodyLarge
                    )
                    if (type.isRequired) {
                        Text(
                            text = "*",
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }

                if (uploadedDocument != null) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(statusColor)
                        )
                        Text(
                            text = when (uploadedDocument.status) {
                                "VERIFIED" -> "Verified"
                                "PENDING" -> "Pending Review"
                                "REJECTED" -> "Rejected"
                                "EXPIRED" -> "Expired"
                                else -> uploadedDocument.status
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = statusColor
                        )
                    }
                } else {
                    Text(
                        text = type.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Action button
            if (uploadedDocument == null || uploadedDocument.status == "REJECTED") {
                Button(
                    onClick = onUpload,
                    enabled = !isUploading,
                    colors = if (uploadedDocument?.status == "REJECTED")
                        ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                    else ButtonDefaults.buttonColors()
                ) {
                    Text(if (uploadedDocument?.status == "REJECTED") "Re-upload" else "Upload")
                }
            }
        }
    }
}
