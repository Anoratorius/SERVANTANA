import SwiftUI
import CoreLocation

struct SmartMatchView: View {
    @StateObject private var viewModel = SmartMatchViewModel()

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.isLoading {
                Spacer()
                VStack(spacing: 16) {
                    ProgressView()
                    Text("Finding the best matches...")
                        .foregroundStyle(.secondary)
                }
                Spacer()
            } else if viewModel.results.isEmpty {
                Spacer()
                VStack(spacing: 16) {
                    Image(systemName: "person.2.slash").font(.system(size: 48)).foregroundStyle(.secondary)
                    Text("No matches found").font(.headline)
                    Button("Try Again") { Task { await viewModel.findMatches() } }
                }
                Spacer()
            } else {
                // Results
                List(viewModel.results) { result in
                    NavigationLink {
                        WorkerProfileView(workerId: result.worker.id)
                    } label: {
                        SmartMatchRow(result: result)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Smart Match")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { Task { await viewModel.findMatches() } } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
        .task { await viewModel.findMatches() }
    }
}

struct SmartMatchRow: View {
    let result: SmartMatchResult

    var body: some View {
        HStack(spacing: 12) {
            // Match score
            ZStack {
                Circle().stroke(Color.accentColor, lineWidth: 3).frame(width: 50, height: 50)
                Text("\(result.matchPercentage)%").font(.caption).fontWeight(.bold)
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(result.worker.fullName).font(.headline)
                    if result.worker.isVerified {
                        Image(systemName: "checkmark.seal.fill").foregroundStyle(.blue).font(.caption)
                    }
                }
                if let profession = result.worker.profession {
                    Text(profession).font(.subheadline).foregroundStyle(.secondary)
                }
                if let recommendation = result.recommendation {
                    Text(recommendation).font(.caption).foregroundStyle(.green).lineLimit(1)
                }
            }

            Spacer()

            VStack(alignment: .trailing) {
                HStack(spacing: 2) {
                    Image(systemName: "star.fill").foregroundStyle(.yellow)
                    Text(String(format: "%.1f", result.worker.rating))
                }.font(.caption)
                if let rate = result.worker.hourlyRate {
                    Text("\(Int(rate))€/hr").font(.caption).foregroundStyle(.blue)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

@MainActor
class SmartMatchViewModel: ObservableObject {
    @Published var results: [SmartMatchResult] = []
    @Published var isLoading = false

    func findMatches() async {
        isLoading = true
        do {
            let request = SmartMatchRequest(
                categoryId: nil, professionId: nil,
                latitude: 52.52, longitude: 13.405, // Berlin default
                maxDistance: 50, preferences: nil
            )
            let response = try await APIClient.shared.smartMatch(request)
            results = response.matches.sorted { $0.matchScore > $1.matchScore }
        } catch {}
        isLoading = false
    }
}
