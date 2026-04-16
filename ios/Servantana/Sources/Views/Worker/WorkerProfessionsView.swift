import SwiftUI

struct WorkerProfessionsView: View {
    @EnvironmentObject var onboardingManager: WorkerOnboardingManager
    @State private var selectedCategory: Category?
    @State private var searchText = ""

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("Select Your Services")
                    .font(.title2.bold())

                Text("Choose the services you offer. Select at least one and mark your primary service.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()

            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)
                TextField("Search services...", text: $searchText)
            }
            .padding(10)
            .background(Color(.systemGray6))
            .cornerRadius(10)
            .padding(.horizontal)

            // Category pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    CategoryPill(
                        title: "All",
                        isSelected: selectedCategory == nil
                    ) {
                        selectedCategory = nil
                    }

                    ForEach(onboardingManager.categories) { category in
                        CategoryPill(
                            title: category.name,
                            isSelected: selectedCategory?.id == category.id
                        ) {
                            selectedCategory = category
                        }
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical, 12)

            // Selected count
            HStack {
                Text("\(onboardingManager.selectedProfessions.count) service\(onboardingManager.selectedProfessions.count == 1 ? "" : "s") selected")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                if !onboardingManager.selectedProfessions.isEmpty {
                    Button("Clear All") {
                        onboardingManager.selectedProfessions.removeAll()
                        onboardingManager.primaryProfessionId = nil
                    }
                    .font(.caption)
                }
            }
            .padding(.horizontal)

            Divider()
                .padding(.top, 8)

            // Professions list
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(filteredProfessions) { profession in
                        ProfessionRow(
                            profession: profession,
                            isSelected: onboardingManager.selectedProfessions.contains(profession.id),
                            isPrimary: onboardingManager.primaryProfessionId == profession.id,
                            onToggle: {
                                onboardingManager.toggleProfession(profession.id)
                            },
                            onSetPrimary: {
                                onboardingManager.primaryProfessionId = profession.id
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
                Task {
                    if await onboardingManager.saveProfessions() {
                        onboardingManager.nextStep()
                    }
                }
            } label: {
                HStack {
                    if onboardingManager.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Save & Continue")
                        Image(systemName: "arrow.right")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(isValid ? Color.blue : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(!isValid || onboardingManager.isLoading)
            .padding()
        }
    }

    private var filteredProfessions: [Profession] {
        var professions = onboardingManager.availableProfessions

        if let category = selectedCategory {
            professions = professions.filter { $0.categoryId == category.id }
        }

        if !searchText.isEmpty {
            professions = professions.filter {
                $0.name.localizedCaseInsensitiveContains(searchText)
            }
        }

        return professions
    }

    private var isValid: Bool {
        !onboardingManager.selectedProfessions.isEmpty && onboardingManager.primaryProfessionId != nil
    }
}

struct CategoryPill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue : Color(.systemGray6))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

struct ProfessionRow: View {
    let profession: Profession
    let isSelected: Bool
    let isPrimary: Bool
    let onToggle: () -> Void
    let onSetPrimary: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Selection checkbox
            Button(action: onToggle) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundColor(isSelected ? .blue : .gray)
            }

            // Icon
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 40, height: 40)

                if let icon = profession.icon {
                    Text(icon)
                        .font(.title3)
                }
            }

            // Info
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(profession.name)
                        .font(.subheadline.weight(.medium))

                    if isPrimary {
                        Text("PRIMARY")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.green)
                            .cornerRadius(4)
                    }
                }

                if let description = profession.description {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Primary button (only show if selected and not already primary)
            if isSelected && !isPrimary {
                Button("Set Primary") {
                    onSetPrimary()
                }
                .font(.caption)
                .foregroundColor(.blue)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isSelected ? Color.blue.opacity(0.05) : Color(.systemGray6))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSelected ? Color.blue.opacity(0.3) : Color.clear, lineWidth: 1)
                )
        )
    }
}

#Preview {
    WorkerProfessionsView()
        .environmentObject(WorkerOnboardingManager.shared)
}
