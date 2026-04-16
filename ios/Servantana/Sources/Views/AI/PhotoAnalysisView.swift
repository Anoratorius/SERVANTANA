import SwiftUI
import PhotosUI

struct PhotoAnalysisView: View {
    @StateObject private var viewModel = PhotoAnalysisViewModel()
    @State private var showImagePicker = false
    @State private var selectedMode: AnalysisMode = .single

    enum AnalysisMode: String, CaseIterable {
        case single = "Single Photo"
        case beforeAfter = "Before & After"
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Mode selector
                Picker("Analysis Mode", selection: $selectedMode) {
                    ForEach(AnalysisMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                // Photo selection area
                photoSelectionSection

                // Analyze button
                if !viewModel.selectedImages.isEmpty {
                    Button {
                        Task {
                            await viewModel.analyzePhotos(mode: selectedMode == .beforeAfter ? "before_after" : "single")
                        }
                    } label: {
                        HStack {
                            if viewModel.isAnalyzing {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "sparkles")
                            }
                            Text(viewModel.isAnalyzing ? "Analyzing..." : "Analyze Photos")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .cornerRadius(12)
                    }
                    .disabled(viewModel.isAnalyzing)
                    .padding(.horizontal)
                }

                // Results
                if let result = viewModel.analysisResult {
                    analysisResultsView(result: result)
                }

                if let comparison = viewModel.comparisonResult {
                    comparisonResultsView(comparison: comparison)
                }

                // Error
                if let error = viewModel.error {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.caption)
                        .padding()
                }
            }
            .padding(.vertical)
        }
        .navigationTitle("Photo Analysis")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showImagePicker) {
            ImagePicker(images: $viewModel.selectedImages, maxSelection: selectedMode == .beforeAfter ? 2 : 5)
        }
    }

    private var photoSelectionSection: some View {
        VStack(spacing: 16) {
            if viewModel.selectedImages.isEmpty {
                Button { showImagePicker = true } label: {
                    VStack(spacing: 12) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 40))
                        Text(selectedMode == .beforeAfter ? "Select Before & After Photos" : "Select Photos to Analyze")
                            .font(.headline)
                        Text(selectedMode == .beforeAfter ? "Select 2 photos" : "Select up to 5 photos")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 200)
                    .background(Color(.systemGray6))
                    .cornerRadius(16)
                }
                .padding(.horizontal)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(Array(viewModel.selectedImages.enumerated()), id: \.offset) { index, image in
                            ZStack(alignment: .topTrailing) {
                                Image(uiImage: image)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 120, height: 120)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))

                                if selectedMode == .beforeAfter {
                                    Text(index == 0 ? "Before" : "After")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(index == 0 ? Color.orange : Color.green)
                                        .foregroundStyle(.white)
                                        .cornerRadius(4)
                                        .padding(4)
                                }

                                Button {
                                    viewModel.selectedImages.remove(at: index)
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundStyle(.white, .red)
                                }
                                .offset(x: 8, y: -8)
                            }
                        }

                        if viewModel.selectedImages.count < (selectedMode == .beforeAfter ? 2 : 5) {
                            Button { showImagePicker = true } label: {
                                VStack {
                                    Image(systemName: "plus")
                                        .font(.title)
                                }
                                .frame(width: 120, height: 120)
                                .background(Color(.systemGray5))
                                .cornerRadius(12)
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }

    private func analysisResultsView(result: PhotoAnalysisSummary) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Analysis Results")
                .font(.headline)
                .padding(.horizontal)

            // Score card
            HStack {
                VStack {
                    Text("\(String(format: "%.1f", result.averageCleanlinessScore))")
                        .font(.system(size: 36, weight: .bold))
                    Text("Cleanliness")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)

                Divider().frame(height: 50)

                VStack {
                    Text(result.overallCondition.capitalized)
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundStyle(conditionColor(result.overallCondition))
                    Text("Condition")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)

                Divider().frame(height: 50)

                VStack {
                    Text("\(result.totalEstimatedTime) min")
                        .font(.title2)
                        .fontWeight(.semibold)
                    Text("Est. Time")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding(.horizontal)

            // Concerns
            if !result.allConcerns.isEmpty {
                issuesList(title: "Areas of Concern", items: result.allConcerns, icon: "exclamationmark.triangle.fill", color: .orange)
            }

            // Positives
            if !result.allPositives.isEmpty {
                issuesList(title: "Positive Aspects", items: result.allPositives, icon: "checkmark.circle.fill", color: .green)
            }
        }
    }

    private func comparisonResultsView(comparison: BeforeAfterComparison) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Comparison Results")
                .font(.headline)
                .padding(.horizontal)

            // Improvement score
            VStack(spacing: 8) {
                Text("\(comparison.improvementScore)%")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundStyle(comparison.improvementScore >= 70 ? .green : comparison.improvementScore >= 40 ? .orange : .red)
                Text("Improvement")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack {
                    VStack {
                        Text("\(comparison.beforeScore)/10")
                            .font(.headline)
                        Text("Before")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)

                    Image(systemName: "arrow.right")
                        .foregroundStyle(.secondary)

                    VStack {
                        Text("\(comparison.afterScore)/10")
                            .font(.headline)
                        Text("After")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding(.horizontal)

            // Quality verification
            HStack {
                Image(systemName: comparison.qualityVerified ? "checkmark.seal.fill" : "xmark.seal.fill")
                    .foregroundStyle(comparison.qualityVerified ? .green : .red)
                Text(comparison.qualityVerified ? "Quality Verified" : "Quality Not Verified")
                    .fontWeight(.medium)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(comparison.qualityVerified ? Color.green.opacity(0.1) : Color.red.opacity(0.1))
            .cornerRadius(12)
            .padding(.horizontal)

            // Notes
            if !comparison.verificationNotes.isEmpty {
                Text(comparison.verificationNotes)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
            }

            // Improvements
            if !comparison.improvements.isEmpty {
                issuesList(title: "Improvements Made", items: comparison.improvements, icon: "arrow.up.circle.fill", color: .green)
            }

            // Remaining issues
            if !comparison.remainingIssues.isEmpty {
                issuesList(title: "Remaining Issues", items: comparison.remainingIssues, icon: "exclamationmark.circle.fill", color: .orange)
            }
        }
    }

    private func issuesList(title: String, items: [String], icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal)

            VStack(alignment: .leading, spacing: 6) {
                ForEach(items, id: \.self) { item in
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: icon)
                            .foregroundStyle(color)
                            .font(.caption)
                        Text(item)
                            .font(.caption)
                    }
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding(.horizontal)
        }
    }

    private func conditionColor(_ condition: String) -> Color {
        switch condition.lowercased() {
        case "excellent": return .green
        case "good": return .blue
        case "fair": return .orange
        case "poor": return .red
        default: return .secondary
        }
    }
}

// MARK: - ViewModel
@MainActor
class PhotoAnalysisViewModel: ObservableObject {
    @Published var selectedImages: [UIImage] = []
    @Published var isAnalyzing = false
    @Published var analysisResult: PhotoAnalysisSummary?
    @Published var comparisonResult: BeforeAfterComparison?
    @Published var error: String?

    func analyzePhotos(mode: String) async {
        guard !selectedImages.isEmpty else { return }

        isAnalyzing = true
        error = nil
        analysisResult = nil
        comparisonResult = nil

        do {
            // Convert images to base64 URLs (in production, upload to storage first)
            let imageUrls = selectedImages.compactMap { image -> String? in
                guard let data = image.jpegData(compressionQuality: 0.7) else { return nil }
                return "data:image/jpeg;base64,\(data.base64EncodedString())"
            }

            let response = try await APIClient.shared.analyzePhotos(imageUrls: imageUrls, analysisType: mode)

            if mode == "before_after" {
                comparisonResult = response.comparison
            } else {
                analysisResult = response.summary
            }
        } catch {
            self.error = error.localizedDescription
        }

        isAnalyzing = false
    }
}

// MARK: - Image Picker
struct ImagePicker: UIViewControllerRepresentable {
    @Binding var images: [UIImage]
    let maxSelection: Int

    func makeUIViewController(context: Context) -> PHPickerViewController {
        var config = PHPickerConfiguration()
        config.selectionLimit = maxSelection
        config.filter = .images

        let picker = PHPickerViewController(configuration: config)
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: PHPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    class Coordinator: NSObject, PHPickerViewControllerDelegate {
        let parent: ImagePicker

        init(_ parent: ImagePicker) {
            self.parent = parent
        }

        func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
            picker.dismiss(animated: true)

            for result in results {
                if result.itemProvider.canLoadObject(ofClass: UIImage.self) {
                    result.itemProvider.loadObject(ofClass: UIImage.self) { [weak self] image, _ in
                        if let image = image as? UIImage {
                            DispatchQueue.main.async {
                                self?.parent.images.append(image)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Models
struct PhotoAnalysisSummary: Codable {
    let averageCleanlinessScore: Double
    let overallCondition: String
    let allConcerns: [String]
    let allPositives: [String]
    let averageJobComplexity: String
    let totalEstimatedTime: Int
    let averageConfidence: Int
}

struct BeforeAfterComparison: Codable {
    let improvementScore: Int
    let beforeScore: Int
    let afterScore: Int
    let improvements: [String]
    let remainingIssues: [String]
    let qualityVerified: Bool
    let verificationNotes: String
}

struct PhotoAnalysisResponse: Codable {
    let type: String
    let summary: PhotoAnalysisSummary?
    let comparison: BeforeAfterComparison?
}

#Preview {
    NavigationStack {
        PhotoAnalysisView()
    }
}
