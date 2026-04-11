import SwiftUI

struct SearchView: View {
    let categoryId: String?

    @StateObject private var viewModel = SearchViewModel()
    @State private var searchText = ""

    init(categoryId: String? = nil) {
        self.categoryId = categoryId
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("Search workers...", text: $searchText)
                        .textFieldStyle(.plain)
                        .onSubmit {
                            Task {
                                await viewModel.search(query: searchText, categoryId: categoryId)
                            }
                        }
                    if !searchText.isEmpty {
                        Button {
                            searchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding()

                // Filters
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(title: "Rating 4+", isSelected: viewModel.minRating != nil) {
                            viewModel.toggleRatingFilter()
                        }
                        FilterChip(title: "Eco-Friendly", isSelected: viewModel.ecoFriendly) {
                            viewModel.ecoFriendly.toggle()
                        }
                        FilterChip(title: "Pet-Friendly", isSelected: viewModel.petFriendly) {
                            viewModel.petFriendly.toggle()
                        }
                        FilterChip(title: "Verified", isSelected: viewModel.verifiedOnly) {
                            viewModel.verifiedOnly.toggle()
                        }
                    }
                    .padding(.horizontal)
                }

                // Results
                if viewModel.isLoading {
                    Spacer()
                    ProgressView()
                    Spacer()
                } else if viewModel.workers.isEmpty {
                    Spacer()
                    VStack(spacing: 16) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("No workers found")
                            .font(.headline)
                        Text("Try adjusting your filters")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                } else {
                    List(viewModel.workers) { worker in
                        NavigationLink {
                            WorkerProfileView(workerId: worker.id)
                        } label: {
                            WorkerListRow(worker: worker)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Search")
            .task {
                await viewModel.search(categoryId: categoryId)
            }
        }
    }
}

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color(.systemGray6))
                .foregroundStyle(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

struct WorkerListRow: View {
    let worker: Worker

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(Color(.systemGray4))
                .frame(width: 50, height: 50)
                .overlay {
                    Image(systemName: "person.fill")
                        .foregroundStyle(.white)
                }

            // Info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(worker.fullName)
                        .font(.headline)

                    if worker.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(.blue)
                            .font(.caption)
                    }
                }

                if let profession = worker.profession {
                    Text(profession)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                HStack(spacing: 12) {
                    // Rating
                    HStack(spacing: 2) {
                        Image(systemName: "star.fill")
                            .foregroundStyle(.yellow)
                        Text(String(format: "%.1f", worker.rating))
                    }
                    .font(.caption)

                    // Price
                    if let rate = worker.hourlyRate {
                        Text("\(Int(rate))€/hr")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.blue)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    SearchView()
}
