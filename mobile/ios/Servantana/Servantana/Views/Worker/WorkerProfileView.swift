import SwiftUI

@MainActor
class WorkerProfileViewModel: ObservableObject {
    @Published var worker: Worker?
    @Published var reviews: [Review] = []
    @Published var isLoading = true
    @Published var error: String?

    let workerId: String

    init(workerId: String) {
        self.workerId = workerId
    }

    func loadWorker() async {
        isLoading = true
        error = nil

        do {
            async let workerTask = APIService.shared.getWorker(id: workerId)
            async let reviewsTask = APIService.shared.getWorkerReviews(id: workerId)

            worker = try await workerTask
            reviews = try await reviewsTask
        } catch APIError.serverError(let message) {
            error = message
        } catch {
            self.error = "Failed to load worker"
        }

        isLoading = false
    }
}

struct WorkerProfileView: View {
    let workerId: String
    @StateObject private var viewModel: WorkerProfileViewModel

    init(workerId: String) {
        self.workerId = workerId
        self._viewModel = StateObject(wrappedValue: WorkerProfileViewModel(workerId: workerId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else if let error = viewModel.error {
                VStack(spacing: 16) {
                    Text(error)
                        .foregroundColor(.red)
                    Button("Retry") {
                        Task {
                            await viewModel.loadWorker()
                        }
                    }
                }
            } else if let worker = viewModel.worker {
                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        VStack(spacing: 12) {
                            Circle()
                                .fill(Color.accentColor.opacity(0.1))
                                .frame(width: 96, height: 96)
                                .overlay(
                                    Text(worker.initials)
                                        .font(.largeTitle)
                                        .fontWeight(.bold)
                                        .foregroundColor(.accentColor)
                                )

                            HStack {
                                Text(worker.fullName)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                if worker.verified == true {
                                    Image(systemName: "checkmark.seal.fill")
                                        .foregroundColor(.accentColor)
                                }
                            }

                            if let rating = worker.rating {
                                HStack(spacing: 4) {
                                    ForEach(0..<5) { index in
                                        Image(systemName: index < Int(rating) ? "star.fill" : "star")
                                            .foregroundColor(index < Int(rating) ? .yellow : .gray)
                                    }
                                    Text(String(format: "%.1f", rating))
                                        .fontWeight(.semibold)
                                    Text("(\(worker.reviewCount ?? 0) reviews)")
                                        .foregroundColor(.secondary)
                                }
                            }

                            if let rate = worker.hourlyRate {
                                Text("€\(Int(rate))/hour")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundColor(.accentColor)
                            }
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color.accentColor.opacity(0.1))

                        // Bio
                        if let bio = worker.bio, !bio.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("About")
                                    .font(.headline)
                                Text(bio)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        // Services
                        if let services = worker.services, !services.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Services")
                                    .font(.headline)
                                    .padding(.horizontal)

                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 8) {
                                        ForEach(services) { service in
                                            Text(service.name)
                                                .font(.subheadline)
                                                .padding(.horizontal, 12)
                                                .padding(.vertical, 8)
                                                .background(Color(.systemGray6))
                                                .cornerRadius(20)
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                            }
                        }

                        // Reviews
                        if !viewModel.reviews.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Reviews")
                                    .font(.headline)
                                    .padding(.horizontal)

                                ForEach(viewModel.reviews.prefix(5)) { review in
                                    ReviewCard(review: review)
                                }
                            }
                        }

                        // Distance
                        if let distance = worker.distance {
                            HStack {
                                Image(systemName: "location")
                                    .foregroundColor(.accentColor)
                                Text("\(String(format: "%.1f", distance)) km away")
                            }
                            .padding()
                            .frame(maxWidth: .infinity)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                            .padding(.horizontal)
                        }

                        Spacer()
                            .frame(height: 80)
                    }
                }
                .safeAreaInset(edge: .bottom) {
                    HStack(spacing: 12) {
                        NavigationLink(destination: ConversationView(partnerId: worker.id)) {
                            Label("Message", systemImage: "message.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)

                        NavigationLink(destination: BookServiceView(workerId: worker.id)) {
                            Label("Book Now", systemImage: "calendar")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                    .background(.ultraThinMaterial)
                }
            }
        }
        .navigationTitle("Professional")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadWorker()
        }
    }
}

struct ReviewCard: View {
    let review: Review

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Circle()
                    .fill(Color.accentColor.opacity(0.1))
                    .frame(width: 32, height: 32)
                    .overlay(
                        Text(review.reviewer?.firstName.prefix(1) ?? "?")
                            .font(.caption)
                            .foregroundColor(.accentColor)
                    )

                Text(review.reviewer?.fullName ?? "Customer")
                    .fontWeight(.medium)

                Spacer()

                HStack(spacing: 2) {
                    ForEach(0..<5) { index in
                        Image(systemName: index < review.rating ? "star.fill" : "star")
                            .font(.caption)
                            .foregroundColor(index < review.rating ? .yellow : .gray)
                    }
                }
            }

            if let comment = review.comment, !comment.isEmpty {
                Text(comment)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
            }

            Text(formatDate(review.createdAt))
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 5)
        .padding(.horizontal)
    }

    private func formatDate(_ isoDate: String) -> String {
        if let range = isoDate.range(of: "T") {
            return String(isoDate[..<range.lowerBound])
        }
        return isoDate
    }
}

#Preview {
    NavigationStack {
        WorkerProfileView(workerId: "123")
    }
}
