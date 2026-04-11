import SwiftUI

struct WorkerProfileView: View {
    let workerId: String
    @StateObject private var viewModel: WorkerProfileViewModel

    init(workerId: String) {
        self.workerId = workerId
        _viewModel = StateObject(wrappedValue: WorkerProfileViewModel(workerId: workerId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                ProgressView().padding(.top, 100)
            } else if let worker = viewModel.worker {
                VStack(spacing: 24) {
                    headerSection(worker)
                    statsSection(worker)
                    if let bio = worker.workerProfile?.bio { bioSection(bio) }
                    servicesSection(worker)
                    reviewsSection
                    bookButton(worker)
                }
                .padding()
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { Task { await viewModel.toggleFavorite() } } label: {
                    Image(systemName: viewModel.isFavorite ? "heart.fill" : "heart")
                        .foregroundStyle(viewModel.isFavorite ? .red : .primary)
                }
            }
        }
    }

    private func headerSection(_ worker: Worker) -> some View {
        VStack(spacing: 12) {
            Circle().fill(Color(.systemGray4)).frame(width: 100, height: 100)
                .overlay { Image(systemName: "person.fill").font(.largeTitle).foregroundStyle(.white) }

            HStack {
                Text(worker.fullName).font(.title2).fontWeight(.bold)
                if worker.isVerified {
                    Image(systemName: "checkmark.seal.fill").foregroundStyle(.blue)
                }
            }

            if let profession = worker.profession {
                Text(profession).foregroundStyle(.secondary)
            }
        }
    }

    private func statsSection(_ worker: Worker) -> some View {
        HStack(spacing: 32) {
            StatItem(value: String(format: "%.1f", worker.rating), label: "Rating", icon: "star.fill")
            StatItem(value: "\(worker.reviewCount)", label: "Reviews", icon: "text.bubble")
            if let rate = worker.hourlyRate {
                StatItem(value: "\(Int(rate))€", label: "Per Hour", icon: "eurosign")
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(16)
    }

    private func bioSection(_ bio: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("About").font(.headline)
            Text(bio).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func servicesSection(_ worker: Worker) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Services").font(.headline)
            ForEach(worker.workerProfile?.services ?? [], id: \.service.id) { ws in
                HStack {
                    Text(ws.service.name)
                    Spacer()
                    Text("\(Int(ws.customPrice ?? ws.service.basePrice))€")
                        .fontWeight(.medium).foregroundStyle(.blue)
                }
                .padding().background(Color(.systemGray6)).cornerRadius(12)
            }
        }
    }

    private var reviewsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Reviews").font(.headline)
                Spacer()
                NavigationLink("See All") { ReviewInsightsView(workerId: workerId) }
                    .font(.subheadline)
            }
            ForEach(viewModel.reviews.prefix(3)) { review in
                ReviewCard(review: review)
            }
        }
    }

    private func bookButton(_ worker: Worker) -> some View {
        NavigationLink {
            CreateBookingView(workerId: worker.id)
        } label: {
            Text("Book Now")
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.accentColor)
                .foregroundStyle(.white)
                .cornerRadius(12)
        }
    }
}

struct StatItem: View {
    let value: String, label: String, icon: String
    var body: some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon).font(.caption).foregroundStyle(.yellow)
                Text(value).fontWeight(.bold)
            }
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct ReviewCard: View {
    let review: Review
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(review.customer?.fullName ?? "Customer").fontWeight(.medium)
                Spacer()
                HStack(spacing: 2) {
                    ForEach(0..<5) { i in
                        Image(systemName: i < review.rating ? "star.fill" : "star")
                            .font(.caption).foregroundStyle(.yellow)
                    }
                }
            }
            if let comment = review.comment { Text(comment).font(.subheadline).foregroundStyle(.secondary) }
        }
        .padding().background(Color(.systemGray6)).cornerRadius(12)
    }
}

@MainActor
class WorkerProfileViewModel: ObservableObject {
    @Published var worker: Worker?
    @Published var reviews: [Review] = []
    @Published var isFavorite = false
    @Published var isLoading = false

    private let workerId: String

    init(workerId: String) {
        self.workerId = workerId
        Task { await loadWorker() }
    }

    func loadWorker() async {
        isLoading = true
        do {
            let response = try await APIClient.shared.getWorker(id: workerId)
            worker = response.worker
            let reviewsResponse = try await APIClient.shared.getWorkerReviews(workerId: workerId)
            reviews = reviewsResponse.reviews
        } catch {}
        isLoading = false
    }

    func toggleFavorite() async {
        do {
            if isFavorite {
                _ = try await APIClient.shared.removeFavorite(workerId: workerId)
            } else {
                _ = try await APIClient.shared.addFavorite(workerId: workerId)
            }
            isFavorite.toggle()
        } catch {}
    }
}
