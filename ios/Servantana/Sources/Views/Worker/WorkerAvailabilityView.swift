import SwiftUI

struct WorkerAvailabilityView: View {
    @EnvironmentObject var onboardingManager: WorkerOnboardingManager

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("Set Your Schedule")
                    .font(.title2.bold())

                Text("Define when you're available to accept bookings. Customers will only be able to book during these times.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()

            // Quick actions
            HStack(spacing: 12) {
                QuickActionButton(title: "Weekdays", subtitle: "Mon-Fri") {
                    setWeekdays()
                }

                QuickActionButton(title: "Every Day", subtitle: "All week") {
                    setEveryDay()
                }

                QuickActionButton(title: "Clear All", subtitle: "Reset") {
                    clearAll()
                }
            }
            .padding(.horizontal)

            Divider()
                .padding(.vertical, 12)

            // Days list
            ScrollView {
                VStack(spacing: 12) {
                    ForEach($onboardingManager.availability) { $day in
                        DayAvailabilityRow(day: $day)
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
                    if await onboardingManager.saveAvailability() {
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

    private var isValid: Bool {
        onboardingManager.availability.contains { $0.isEnabled }
    }

    private func setWeekdays() {
        for index in onboardingManager.availability.indices {
            let dayOfWeek = onboardingManager.availability[index].dayOfWeek
            onboardingManager.availability[index].isEnabled = dayOfWeek >= 1 && dayOfWeek <= 5
        }
    }

    private func setEveryDay() {
        for index in onboardingManager.availability.indices {
            onboardingManager.availability[index].isEnabled = true
        }
    }

    private func clearAll() {
        for index in onboardingManager.availability.indices {
            onboardingManager.availability[index].isEnabled = false
        }
    }
}

struct QuickActionButton: View {
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text(title)
                    .font(.caption.bold())
                Text(subtitle)
                    .font(.system(size: 10))
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color(.systemGray6))
            .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}

struct DayAvailabilityRow: View {
    @Binding var day: WorkerOnboardingManager.DayAvailability
    @State private var showingTimePicker = false

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                // Day toggle
                Toggle(isOn: $day.isEnabled) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(day.dayName)
                            .font(.headline)

                        if day.isEnabled {
                            Text(timeRangeString)
                                .font(.caption)
                                .foregroundColor(.blue)
                        } else {
                            Text("Not available")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .tint(.blue)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(day.isEnabled ? Color.blue.opacity(0.05) : Color(.systemGray6))
            )

            // Time pickers (expanded when enabled)
            if day.isEnabled {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Start")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        DatePicker(
                            "",
                            selection: $day.startTime,
                            displayedComponents: .hourAndMinute
                        )
                        .labelsHidden()
                        .datePickerStyle(.compact)
                    }

                    Image(systemName: "arrow.right")
                        .foregroundColor(.secondary)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("End")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        DatePicker(
                            "",
                            selection: $day.endTime,
                            displayedComponents: .hourAndMinute
                        )
                        .labelsHidden()
                        .datePickerStyle(.compact)
                    }

                    Spacer()
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(Color.blue.opacity(0.03))
                .cornerRadius(8)
                .padding(.top, 4)
            }
        }
    }

    private var timeRangeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return "\(formatter.string(from: day.startTime)) - \(formatter.string(from: day.endTime))"
    }
}

#Preview {
    WorkerAvailabilityView()
        .environmentObject(WorkerOnboardingManager.shared)
}
