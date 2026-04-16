import SwiftUI
import PhotosUI

struct PriceEstimateView: View {
    @StateObject private var viewModel = PriceEstimateViewModel()
    @State private var selectedItems: [PhotosPickerItem] = []

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Info card
                HStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .font(.title)
                        .foregroundStyle(.tint)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Get Instant Price Estimates")
                            .font(.headline)
                        Text("Upload photos of your space and our AI will analyze the job size and provide accurate pricing.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .background(Color.accentColor.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)

                // Service type selector
                VStack(alignment: .leading, spacing: 8) {
                    Text("Service Type")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .padding(.horizontal)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ServiceTypeChip(title: "Cleaning", type: "cleaning", selectedType: $viewModel.serviceType)
                            ServiceTypeChip(title: "Deep Clean", type: "deep", selectedType: $viewModel.serviceType)
                            ServiceTypeChip(title: "Move In/Out", type: "moveInOut", selectedType: $viewModel.serviceType)
                            ServiceTypeChip(title: "Office", type: "office", selectedType: $viewModel.serviceType)
                        }
                        .padding(.horizontal)
                    }
                }

                // Photo picker
                PhotosPicker(
                    selection: $selectedItems,
                    maxSelectionCount: 5,
                    matching: .images
                ) {
                    if viewModel.selectedImages.isEmpty {
                        PhotoUploadPlaceholder()
                    } else {
                        SelectedPhotosGrid(
                            images: viewModel.selectedImages,
                            onRemove: { viewModel.removeImage(at: $0) }
                        )
                    }
                }
                .onChange(of: selectedItems) { _, newItems in
                    Task {
                        for item in newItems {
                            if let data = try? await item.loadTransferable(type: Data.self),
                               let image = UIImage(data: data) {
                                viewModel.addImage(image)
                            }
                        }
                        selectedItems = []
                    }
                }

                // Additional info
                VStack(alignment: .leading, spacing: 8) {
                    Text("Additional Information (optional)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    TextField("E.g., Pet hair, recent renovation...", text: $viewModel.additionalInfo, axis: .vertical)
                        .lineLimit(2...4)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                // Estimate button
                if !viewModel.selectedImages.isEmpty {
                    Button {
                        Task { await viewModel.getEstimate() }
                    } label: {
                        HStack {
                            if viewModel.isLoading {
                                ProgressView()
                                    .progressViewStyle(.circular)
                                    .tint(.white)
                                Text("Analyzing...")
                            } else {
                                Image(systemName: "equal.circle")
                                Text("Get Price Estimate")
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.accentColor)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .disabled(viewModel.isLoading)
                    .padding(.horizontal)
                }

                // Error
                if let error = viewModel.error {
                    Text(error)
                        .foregroundStyle(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .padding(.horizontal)
                }

                // Results
                if let estimate = viewModel.estimate {
                    EstimateResultView(estimate: estimate)
                }
            }
            .padding(.vertical)
        }
        .navigationTitle("AI Price Estimate")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ServiceTypeChip: View {
    let title: String
    let type: String
    @Binding var selectedType: String

    var body: some View {
        Button {
            selectedType = type
        } label: {
            Text(title)
                .font(.subheadline)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(selectedType == type ? Color.accentColor : Color(.systemGray5))
                .foregroundStyle(selectedType == type ? .white : .primary)
                .clipShape(Capsule())
        }
    }
}

struct PhotoUploadPlaceholder: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.badge.plus")
                .font(.system(size: 48))
                .foregroundStyle(.tint)

            Text("Upload Photos of Your Space")
                .font(.headline)

            Text("Take photos of rooms or areas that need service. Up to 5 photos.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(32)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

struct SelectedPhotosGrid: View {
    let images: [UIImage]
    let onRemove: (Int) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(Array(images.enumerated()), id: \.offset) { index, image in
                    ZStack(alignment: .topTrailing) {
                        Image(uiImage: image)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 100, height: 100)
                            .clipShape(RoundedRectangle(cornerRadius: 12))

                        Button {
                            onRemove(index)
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.white, .red)
                                .font(.title3)
                        }
                        .offset(x: 8, y: -8)
                    }
                }

                if images.count < 5 {
                    VStack {
                        Image(systemName: "plus")
                            .font(.title)
                            .foregroundStyle(.tint)
                    }
                    .frame(width: 100, height: 100)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [8]))
                            .foregroundStyle(.secondary.opacity(0.5))
                    )
                }
            }
            .padding(.horizontal)
        }
    }
}

struct EstimateResultView: View {
    let estimate: PriceEstimateResult
    @State private var showBreakdown = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Text("Price Estimate")
                    .font(.headline)
                Spacer()
                Text("\(estimate.confidence)% confident")
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .background(confidenceColor.opacity(0.1))
                    .foregroundStyle(confidenceColor)
                    .clipShape(Capsule())
            }

            // Price
            VStack(spacing: 4) {
                Text("\(estimate.currency) \(estimate.midPrice)")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundStyle(.tint)
                Text("Range: \(estimate.lowPrice) - \(estimate.highPrice)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)

            Divider()

            // Space analysis
            Text("Space Analysis")
                .font(.subheadline)
                .fontWeight(.medium)

            HStack {
                AnalysisItem(icon: "square.dashed", value: "\(estimate.estimatedSqMeters) m\u{00B2}", label: "Area")
                Spacer()
                AnalysisItem(icon: "door.left.hand.open", value: "\(estimate.roomCount)", label: "Rooms")
                Spacer()
                AnalysisItem(icon: "gauge", value: estimate.condition.capitalized, label: "Condition")
            }

            // Time estimate
            HStack {
                Image(systemName: "clock")
                    .foregroundStyle(.tint)
                VStack(alignment: .leading) {
                    Text("Estimated Duration")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("\(estimate.minMinutes) - \(estimate.maxMinutes) minutes")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                Spacer()
            }
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 8))

            // Room types
            if !estimate.roomTypes.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Detected Rooms")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(estimate.roomTypes, id: \.self) { room in
                                Text(room)
                                    .font(.caption)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color(.systemGray5))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
            }

            // Special requirements
            if !estimate.specialRequirements.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Special Requirements")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    ForEach(estimate.specialRequirements, id: \.self) { req in
                        HStack(alignment: .top, spacing: 8) {
                            Image(systemName: "exclamationmark.triangle")
                                .foregroundStyle(.orange)
                                .font(.caption)
                            Text(req)
                                .font(.caption)
                        }
                    }
                }
            }

            // Notes
            if !estimate.notes.isEmpty {
                Text(estimate.notes)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Breakdown toggle
            DisclosureGroup("Price Breakdown", isExpanded: $showBreakdown) {
                VStack(spacing: 8) {
                    BreakdownRow(label: "Base Price", value: "\(estimate.basePrice)")
                    BreakdownRow(label: "Size Multiplier", value: "×\(String(format: "%.1f", estimate.sizeMultiplier))")
                    BreakdownRow(label: "Difficulty Multiplier", value: "×\(String(format: "%.1f", estimate.difficultyMultiplier))")
                    if estimate.specialtyAddons > 0 {
                        BreakdownRow(label: "Specialty Add-ons", value: "+\(estimate.specialtyAddons)")
                    }
                }
                .padding(.top, 8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
        .padding(.horizontal)
    }

    private var confidenceColor: Color {
        switch estimate.confidence {
        case 80...100: return .green
        case 60..<80: return .blue
        case 40..<60: return .orange
        default: return .red
        }
    }
}

struct AnalysisItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundStyle(.tint)
            Text(value)
                .font(.headline)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

struct BreakdownRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
        }
    }
}

// MARK: - ViewModel

@MainActor
class PriceEstimateViewModel: ObservableObject {
    @Published var selectedImages: [UIImage] = []
    @Published var serviceType: String = "cleaning"
    @Published var additionalInfo: String = ""
    @Published var isLoading = false
    @Published var estimate: PriceEstimateResult?
    @Published var error: String?

    func addImage(_ image: UIImage) {
        if selectedImages.count < 5 {
            selectedImages.append(image)
            error = nil
        }
    }

    func removeImage(at index: Int) {
        selectedImages.remove(at: index)
        estimate = nil
    }

    func getEstimate() async {
        guard !selectedImages.isEmpty else { return }

        isLoading = true
        error = nil

        do {
            // Convert images to base64
            let imageUrls = selectedImages.compactMap { image -> String? in
                guard let resized = image.resized(toMaxDimension: 1024),
                      let data = resized.jpegData(compressionQuality: 0.8) else { return nil }
                return "data:image/jpeg;base64,\(data.base64EncodedString())"
            }

            let request = PriceEstimateRequestBody(
                imageUrls: imageUrls,
                serviceType: serviceType,
                additionalInfo: additionalInfo.isEmpty ? nil : additionalInfo,
                userCurrency: "USD"
            )

            let response: PriceEstimateAPIResponse = try await APIClient.shared.request(
                "ai/estimate",
                method: "POST",
                body: request
            )

            estimate = PriceEstimateResult(from: response)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Models

struct PriceEstimateRequestBody: Codable {
    let imageUrls: [String]
    let serviceType: String
    let additionalInfo: String?
    let userCurrency: String
}

struct PriceEstimateAPIResponse: Codable {
    let estimate: EstimateData
    let marketData: MarketData?

    struct EstimateData: Codable {
        let estimatedPrice: PriceData
        let breakdown: BreakdownData
        let spaceAnalysis: SpaceData
        let timeEstimate: TimeData
        let specialRequirements: [String]
        let confidence: Int
        let notes: String
    }

    struct PriceData: Codable {
        let low: Int
        let mid: Int
        let high: Int
        let currency: String
    }

    struct BreakdownData: Codable {
        let basePrice: Int
        let sizeMultiplier: Double
        let difficultyMultiplier: Double
        let specialtyAddons: Int
    }

    struct SpaceData: Codable {
        let estimatedSqMeters: Int
        let roomCount: Int
        let roomTypes: [String]
        let condition: String
        let difficulty: Int
    }

    struct TimeData: Codable {
        let minMinutes: Int
        let maxMinutes: Int
        let recommended: Int
    }

    struct MarketData: Codable {
        let avgHourlyRate: Int
        let currency: String
    }
}

struct PriceEstimateResult {
    let lowPrice: Int
    let midPrice: Int
    let highPrice: Int
    let currency: String
    let basePrice: Int
    let sizeMultiplier: Double
    let difficultyMultiplier: Double
    let specialtyAddons: Int
    let estimatedSqMeters: Int
    let roomCount: Int
    let roomTypes: [String]
    let condition: String
    let minMinutes: Int
    let maxMinutes: Int
    let specialRequirements: [String]
    let confidence: Int
    let notes: String

    init(from response: PriceEstimateAPIResponse) {
        let e = response.estimate
        self.lowPrice = e.estimatedPrice.low
        self.midPrice = e.estimatedPrice.mid
        self.highPrice = e.estimatedPrice.high
        self.currency = e.estimatedPrice.currency
        self.basePrice = e.breakdown.basePrice
        self.sizeMultiplier = e.breakdown.sizeMultiplier
        self.difficultyMultiplier = e.breakdown.difficultyMultiplier
        self.specialtyAddons = e.breakdown.specialtyAddons
        self.estimatedSqMeters = e.spaceAnalysis.estimatedSqMeters
        self.roomCount = e.spaceAnalysis.roomCount
        self.roomTypes = e.spaceAnalysis.roomTypes
        self.condition = e.spaceAnalysis.condition
        self.minMinutes = e.timeEstimate.minMinutes
        self.maxMinutes = e.timeEstimate.maxMinutes
        self.specialRequirements = e.specialRequirements
        self.confidence = e.confidence
        self.notes = e.notes
    }
}

// MARK: - UIImage Extension

extension UIImage {
    func resized(toMaxDimension maxDimension: CGFloat) -> UIImage? {
        let ratio = max(size.width, size.height) / maxDimension
        if ratio <= 1 { return self }
        let newSize = CGSize(width: size.width / ratio, height: size.height / ratio)
        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return resized
    }
}
