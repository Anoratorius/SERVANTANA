import SwiftUI
import PhotosUI

struct WorkerDocumentsView: View {
    @EnvironmentObject var onboardingManager: WorkerOnboardingManager
    @State private var showingDocumentPicker = false
    @State private var selectedDocumentType: DocumentType?
    @State private var selectedPhotoItem: PhotosPickerItem?

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("Upload Documents")
                    .font(.title2.bold())

                Text("Verify your identity to build trust with customers. All documents are securely stored.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()

            // Required documents notice
            HStack {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(.blue)
                Text("Upload at least one form of ID (Government ID, Driver's License, or Passport)")
                    .font(.caption)
            }
            .padding()
            .background(Color.blue.opacity(0.1))
            .cornerRadius(8)
            .padding(.horizontal)

            Divider()
                .padding(.vertical, 12)

            // Document types list
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(DocumentType.allCases, id: \.self) { type in
                        DocumentTypeRow(
                            type: type,
                            uploadedDocument: onboardingManager.documents.first { $0.type == type },
                            isUploading: onboardingManager.isUploadingDocument && selectedDocumentType == type,
                            onUpload: {
                                selectedDocumentType = type
                                showingDocumentPicker = true
                            }
                        )
                    }
                }
                .padding()
            }

            // Error message
            if let error = onboardingManager.error {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.horizontal)
            }

            // Continue button
            Button {
                onboardingManager.nextStep()
            } label: {
                HStack {
                    Text(hasRequiredDocument ? "Continue" : "Skip for Now")
                    Image(systemName: "arrow.right")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(hasRequiredDocument ? Color.blue : Color.orange)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .padding()
        }
        .photosPicker(
            isPresented: $showingDocumentPicker,
            selection: $selectedPhotoItem,
            matching: .images
        )
        .onChange(of: selectedPhotoItem) { _, newItem in
            if let item = newItem {
                handlePhotoSelection(item)
            }
        }
    }

    private var hasRequiredDocument: Bool {
        let requiredTypes: Set<DocumentType> = [.governmentId, .driversLicense, .passport]
        return onboardingManager.documents.contains { doc in
            requiredTypes.contains(doc.type) && (doc.status == .pending || doc.status == .verified)
        }
    }

    private func handlePhotoSelection(_ item: PhotosPickerItem) {
        Task {
            guard let documentType = selectedDocumentType else { return }

            do {
                if let data = try await item.loadTransferable(type: Data.self) {
                    let fileName = "document_\(Date().timeIntervalSince1970).jpg"
                    let success = await onboardingManager.uploadDocument(
                        data: data,
                        fileName: fileName,
                        mimeType: "image/jpeg",
                        type: documentType
                    )

                    if success {
                        selectedPhotoItem = nil
                        selectedDocumentType = nil
                    }
                }
            } catch {
                onboardingManager.error = "Failed to load image: \(error.localizedDescription)"
            }
        }
    }
}

struct DocumentTypeRow: View {
    let type: DocumentType
    let uploadedDocument: WorkerDocument?
    let isUploading: Bool
    let onUpload: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            ZStack {
                Circle()
                    .fill(iconBackgroundColor)
                    .frame(width: 44, height: 44)

                if isUploading {
                    ProgressView()
                } else {
                    Image(systemName: iconName)
                        .foregroundColor(iconColor)
                }
            }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(type.displayName)
                        .font(.subheadline.weight(.medium))

                    if type.isRequired {
                        Text("*")
                            .foregroundColor(.red)
                    }
                }

                if let document = uploadedDocument {
                    HStack(spacing: 4) {
                        statusBadge(for: document.status)
                        Text(document.status.displayName)
                            .font(.caption)
                            .foregroundColor(statusColor(for: document.status))
                    }
                } else {
                    Text(type.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Action button
            if uploadedDocument == nil {
                Button(action: onUpload) {
                    Text("Upload")
                        .font(.caption.bold())
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.blue)
                        .cornerRadius(6)
                }
                .disabled(isUploading)
            } else if let document = uploadedDocument, document.status == .rejected {
                Button(action: onUpload) {
                    Text("Re-upload")
                        .font(.caption.bold())
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.orange)
                        .cornerRadius(6)
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(uploadedDocument != nil ? statusBackgroundColor : Color(.systemGray6))
        )
    }

    private var iconBackgroundColor: Color {
        guard let document = uploadedDocument else {
            return Color(.systemGray5)
        }
        return statusColor(for: document.status).opacity(0.1)
    }

    private var iconName: String {
        guard let document = uploadedDocument else {
            return "doc.badge.plus"
        }
        switch document.status {
        case .verified: return "checkmark.seal.fill"
        case .pending: return "clock.fill"
        case .rejected: return "xmark.circle.fill"
        case .expired: return "exclamationmark.triangle.fill"
        }
    }

    private var iconColor: Color {
        guard let document = uploadedDocument else {
            return .gray
        }
        return statusColor(for: document.status)
    }

    private var statusBackgroundColor: Color {
        guard let document = uploadedDocument else {
            return Color(.systemGray6)
        }
        return statusColor(for: document.status).opacity(0.05)
    }

    private func statusBadge(for status: DocumentStatus) -> some View {
        Circle()
            .fill(statusColor(for: status))
            .frame(width: 8, height: 8)
    }

    private func statusColor(for status: DocumentStatus) -> Color {
        switch status {
        case .verified: return .green
        case .pending: return .orange
        case .rejected: return .red
        case .expired: return .yellow
        }
    }
}

#Preview {
    WorkerDocumentsView()
        .environmentObject(WorkerOnboardingManager.shared)
}
