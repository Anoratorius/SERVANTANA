import SwiftUI

@MainActor
class SearchViewModel: ObservableObject {
    @Published var query = ""
    @Published var selectedServiceId: String?
    @Published var services: [Service] = []
    @Published var workers: [Worker] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var minRating: Double = 0

    func loadServices() async {
        do {
            services = try await APIService.shared.getServices()
        } catch {
            print("Services error: \(error)")
        }
    }

    func searchWorkers() async {
        isLoading = true
        error = nil

        do {
            var results = try await APIService.shared.getWorkers(
                serviceId: selectedServiceId,
                minRating: minRating > 0 ? minRating : nil
            )

            // Filter by query
            if !query.isEmpty {
                results = results.filter { worker in
                    worker.fullName.localizedCaseInsensitiveContains(query) ||
                    worker.bio?.localizedCaseInsensitiveContains(query) == true ||
                    worker.services?.contains { $0.name.localizedCaseInsensitiveContains(query) } == true
                }
            }

            workers = results
        } catch APIError.serverError(let message) {
            error = message
        } catch {
            error = "Search failed"
        }

        isLoading = false
    }

    func selectService(_ serviceId: String?) {
        selectedServiceId = selectedServiceId == serviceId ? nil : serviceId
        Task {
            await searchWorkers()
        }
    }

    func toggleRatingFilter() {
        minRating = minRating >= 4 ? 0 : 4
        Task {
            await searchWorkers()
        }
    }

    func clearFilters() {
        query = ""
        selectedServiceId = nil
        minRating = 0
        Task {
            await searchWorkers()
        }
    }
}

struct SearchView: View {
    @StateObject private var viewModel = SearchViewModel()
    @State private var showFilters = false

    var body: some View {
        VStack(spacing: 0) {
            // Search Bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                TextField("Search professionals...", text: $viewModel.query)
                    .onSubmit {
                        Task {
                            await viewModel.searchWorkers()
                        }
                    }
                if !viewModel.query.isEmpty {
                    Button(action: {
                        viewModel.query = ""
                        Task {
                            await viewModel.searchWorkers()
                        }
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(12)
            .padding()

            // Filter Chips
            if showFilters || viewModel.selectedServiceId != nil {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(viewModel.services) { service in
                            FilterChip(
                                title: service.name,
                                isSelected: viewModel.selectedServiceId == service.id,
                                action: { viewModel.selectService(service.id) }
                            )
                        }

                        FilterChip(
                            title: "4+ Stars",
                            isSelected: viewModel.minRating >= 4,
                            icon: "star.fill",
                            action: { viewModel.toggleRatingFilter() }
                        )

                        if viewModel.selectedServiceId != nil || viewModel.minRating > 0 {
                            Button("Clear All") {
                                viewModel.clearFilters()
                            }
                            .font(.subheadline)
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.bottom, 8)
            }

            // Results
            if viewModel.isLoading {
                Spacer()
                ProgressView()
                Spacer()
            } else if let error = viewModel.error {
                Spacer()
                VStack(spacing: 16) {
                    Text(error)
                        .foregroundColor(.red)
                    Button("Retry") {
                        Task {
                            await viewModel.searchWorkers()
                        }
                    }
                }
                Spacer()
            } else if viewModel.workers.isEmpty {
                Spacer()
                VStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 48))
                        .foregroundColor(.secondary)
                    Text("No professionals found")
                        .font(.headline)
                    Text("Try adjusting your filters")
                        .foregroundColor(.secondary)
                }
                Spacer()
            } else {
                List(viewModel.workers) { worker in
                    NavigationLink(destination: WorkerProfileView(workerId: worker.id)) {
                        WorkerSearchRow(worker: worker)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Search")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showFilters.toggle() }) {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                        .foregroundColor(
                            viewModel.selectedServiceId != nil || viewModel.minRating > 0
                            ? .accentColor
                            : .secondary
                        )
                }
            }
        }
        .task {
            await viewModel.loadServices()
            await viewModel.searchWorkers()
        }
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    var icon: String? = nil
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.caption)
                }
                Text(title)
                    .font(.subheadline)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.accentColor : Color(.systemGray6))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(20)
        }
    }
}

struct WorkerSearchRow: View {
    let worker: Worker

    var body: some View {
        HStack(spacing: 16) {
            Circle()
                .fill(Color.accentColor.opacity(0.1))
                .frame(width: 60, height: 60)
                .overlay(
                    Text(worker.initials)
                        .fontWeight(.bold)
                        .foregroundColor(.accentColor)
                )

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(worker.fullName)
                        .fontWeight(.semibold)
                    if worker.verified == true {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption)
                            .foregroundColor(.accentColor)
                    }
                }

                if let rating = worker.rating {
                    HStack(spacing: 2) {
                        ForEach(0..<5) { index in
                            Image(systemName: index < Int(rating) ? "star.fill" : "star")
                                .font(.caption)
                                .foregroundColor(index < Int(rating) ? .yellow : .gray)
                        }
                        Text(String(format: "%.1f", rating))
                            .font(.caption)
                        Text("(\(worker.reviewCount ?? 0))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if let services = worker.services, !services.isEmpty {
                    Text(services.map { $0.name }.joined(separator: ", "))
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                if let rate = worker.hourlyRate {
                    Text("€\(Int(rate))/hr")
                        .fontWeight(.semibold)
                        .foregroundColor(.accentColor)
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    NavigationStack {
        SearchView()
    }
}
