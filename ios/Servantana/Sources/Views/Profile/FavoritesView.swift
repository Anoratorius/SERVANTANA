import SwiftUI

struct FavoritesView: View {
    @StateObject private var viewModel = FavoritesViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
            } else if viewModel.favorites.isEmpty {
                emptyState
            } else {
                favoritesList
            }
        }
        .navigationTitle("Favorites")
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "heart")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("No favorites yet")
                .font(.headline)
            Text("Workers you favorite will appear here")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var favoritesList: some View {
        List {
            ForEach(viewModel.favorites) { worker in
                NavigationLink {
                    WorkerProfileView(workerId: worker.id)
                } label: {
                    WorkerListRow(worker: worker)
                }
            }
            .onDelete { indexSet in
                Task {
                    for index in indexSet {
                        await viewModel.removeFavorite(viewModel.favorites[index].id)
                    }
                }
            }
        }
        .listStyle(.plain)
    }
}

@MainActor
class FavoritesViewModel: ObservableObject {
    @Published var favorites: [Worker] = []
    @Published var isLoading = false

    init() {
        Task {
            await loadFavorites()
        }
    }

    func loadFavorites() async {
        isLoading = true
        do {
            let response = try await APIClient.shared.getFavorites()
            favorites = response.favorites.map { $0.cleaner }
        } catch {
            // Handle error
        }
        isLoading = false
    }

    func removeFavorite(_ workerId: String) async {
        do {
            _ = try await APIClient.shared.removeFavorite(workerId: workerId)
            favorites.removeAll { $0.id == workerId }
        } catch {
            // Handle error
        }
    }
}

#Preview {
    NavigationStack {
        FavoritesView()
    }
}
