import SwiftUI

struct SmartScheduleView: View {
    @StateObject private var viewModel = SmartScheduleViewModel()
    @State private var selectedDate = Date()

    var body: some View {
        VStack(spacing: 0) {
            // Date picker
            DatePicker("Select Date", selection: $selectedDate, displayedComponents: .date)
                .datePickerStyle(.graphical)
                .padding()
                .onChange(of: selectedDate) { _, newDate in
                    Task { await viewModel.loadSlots(for: newDate) }
                }

            Divider()

            // Time slots
            if viewModel.isLoading {
                Spacer()
                ProgressView()
                Spacer()
            } else {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        ForEach(viewModel.slots) { slot in
                            TimeSlotCard(slot: slot, isSelected: viewModel.selectedSlot?.id == slot.id) {
                                viewModel.selectedSlot = slot
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Smart Schedule")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.loadSlots(for: selectedDate) }
    }
}

struct TimeSlotCard: View {
    let slot: TimeSlot
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                Text(slot.time).font(.headline)

                HStack(spacing: 4) {
                    Circle().fill(demandColor).frame(width: 6, height: 6)
                    Text(slot.demandLevel.capitalized).font(.caption2)
                }

                if slot.priceMultiplier != 1.0 {
                    Text("\(Int((slot.priceMultiplier - 1) * 100))%")
                        .font(.caption2)
                        .foregroundStyle(slot.priceMultiplier > 1 ? .red : .green)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? Color.accentColor : (slot.available ? Color(.systemGray6) : Color(.systemGray5)))
            .foregroundStyle(isSelected ? .white : (slot.available ? .primary : .secondary))
            .cornerRadius(12)
            .opacity(slot.available ? 1 : 0.5)
        }
        .disabled(!slot.available)
    }

    private var demandColor: Color {
        switch slot.demandLevel {
        case "high": return .red
        case "low": return .green
        default: return .yellow
        }
    }
}

@MainActor
class SmartScheduleViewModel: ObservableObject {
    @Published var slots: [TimeSlot] = []
    @Published var selectedSlot: TimeSlot?
    @Published var isLoading = false

    func loadSlots(for date: Date) async {
        isLoading = true
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        do {
            let request = SmartScheduleRequest(date: formatter.string(from: date), professionId: nil, workerId: nil, duration: nil)
            let response = try await APIClient.shared.smartSchedule(request)
            slots = response.slots
        } catch {}

        isLoading = false
    }
}
