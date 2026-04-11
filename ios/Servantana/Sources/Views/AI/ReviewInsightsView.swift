import SwiftUI

struct ReviewInsightsView: View {
    let workerId: String
    @StateObject private var viewModel: ReviewInsightsViewModel

    init(workerId: String) {
        self.workerId = workerId
        _viewModel = StateObject(wrappedValue: ReviewInsightsViewModel(workerId: workerId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                ProgressView().padding(.top, 100)
            } else {
                VStack(spacing: 20) {
                    // AI badge
                    HStack {
                        Image(systemName: "sparkles").foregroundStyle(.purple)
                        Text("AI-Powered Analysis").font(.subheadline).foregroundStyle(.purple)
                    }

                    // Scores
                    HStack(spacing: 16) {
                        ScoreCard(title: "Sentiment", value: viewModel.overallSentiment, score: viewModel.trustScore, color: sentimentColor)
                        ScoreCard(title: "Trust Score", value: "\(Int(viewModel.trustScore * 100))%", score: viewModel.trustScore, color: .blue)
                    }

                    // Insights
                    if !viewModel.insights.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Category Analysis").font(.headline)
                            ForEach(viewModel.insights) { insight in
                                InsightRow(insight: insight)
                            }
                        }
                    }

                    // Strengths
                    if !viewModel.strengths.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Strengths").font(.headline)
                            ForEach(viewModel.strengths, id: \.self) { strength in
                                HStack {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                                    Text(strength).font(.subheadline)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Review Insights")
        .task { await viewModel.loadInsights() }
    }

    private var sentimentColor: Color {
        switch viewModel.overallSentiment {
        case "Positive": return .green
        case "Negative": return .red
        default: return .yellow
        }
    }
}

struct ScoreCard: View {
    let title: String, value: String
    let score: Double, color: Color

    var body: some View {
        VStack(spacing: 8) {
            Text(title).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.title3).fontWeight(.bold).foregroundStyle(color)
            ProgressView(value: score).tint(color)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct InsightRow: View {
    let insight: ReviewInsight

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(insight.category).font(.subheadline).fontWeight(.medium)
                Spacer()
                Text(insight.sentiment).font(.caption).foregroundStyle(insightColor)
            }
            ProgressView(value: insight.score).tint(insightColor)
            Text("\(insight.mentions) mentions").font(.caption).foregroundStyle(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private var insightColor: Color {
        switch insight.sentiment {
        case "Positive": return .green
        case "Negative": return .red
        default: return .yellow
        }
    }
}

@MainActor
class ReviewInsightsViewModel: ObservableObject {
    @Published var overallSentiment = "Neutral"
    @Published var trustScore = 0.0
    @Published var insights: [ReviewInsight] = []
    @Published var strengths: [String] = []
    @Published var isLoading = false

    private let workerId: String

    init(workerId: String) { self.workerId = workerId }

    func loadInsights() async {
        isLoading = true
        do {
            let request = ReviewInsightsRequest(workerId: workerId)
            let response = try await APIClient.shared.reviewInsights(request)
            overallSentiment = response.overallSentiment
            trustScore = response.trustScore
            insights = response.insights
            strengths = response.strengths
        } catch {}
        isLoading = false
    }
}
