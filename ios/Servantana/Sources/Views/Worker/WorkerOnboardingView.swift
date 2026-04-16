import SwiftUI

struct WorkerOnboardingView: View {
    @StateObject private var onboardingManager = WorkerOnboardingManager.shared
    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress indicator
                OnboardingProgressView(currentStep: onboardingManager.currentStep)
                    .padding()

                // Step content
                TabView(selection: $onboardingManager.currentStep) {
                    WorkerProfileSetupView()
                        .tag(OnboardingStep.profile)

                    WorkerProfessionsView()
                        .tag(OnboardingStep.professions)

                    WorkerAvailabilityView()
                        .tag(OnboardingStep.availability)

                    WorkerDocumentsView()
                        .tag(OnboardingStep.documents)

                    WorkerStripeConnectView()
                        .tag(OnboardingStep.stripeConnect)

                    WorkerGoLiveView()
                        .tag(OnboardingStep.goLive)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: onboardingManager.currentStep)
            }
            .navigationTitle("Become a Service Pro")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if onboardingManager.currentStep.rawValue > 0 {
                        Button("Back") {
                            onboardingManager.previousStep()
                        }
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Sign Out") {
                        Task {
                            await authManager.logout()
                        }
                    }
                    .foregroundColor(.red)
                }
            }
            .environmentObject(onboardingManager)
        }
        .task {
            await onboardingManager.loadInitialData()
        }
    }
}

struct OnboardingProgressView: View {
    let currentStep: OnboardingStep

    var body: some View {
        HStack(spacing: 4) {
            ForEach(OnboardingStep.allCases, id: \.rawValue) { step in
                VStack(spacing: 4) {
                    ZStack {
                        Circle()
                            .fill(stepColor(for: step))
                            .frame(width: 32, height: 32)

                        if step.rawValue < currentStep.rawValue {
                            Image(systemName: "checkmark")
                                .font(.caption.bold())
                                .foregroundColor(.white)
                        } else {
                            Image(systemName: step.icon)
                                .font(.caption)
                                .foregroundColor(step == currentStep ? .white : .gray)
                        }
                    }

                    Text(step.title)
                        .font(.system(size: 9))
                        .foregroundColor(step == currentStep ? .primary : .secondary)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)

                if step.rawValue < OnboardingStep.allCases.count - 1 {
                    Rectangle()
                        .fill(step.rawValue < currentStep.rawValue ? Color.green : Color.gray.opacity(0.3))
                        .frame(height: 2)
                        .frame(maxWidth: 20)
                        .offset(y: -8)
                }
            }
        }
    }

    private func stepColor(for step: OnboardingStep) -> Color {
        if step.rawValue < currentStep.rawValue {
            return .green
        } else if step == currentStep {
            return .blue
        } else {
            return .gray.opacity(0.3)
        }
    }
}

#Preview {
    WorkerOnboardingView()
        .environmentObject(AuthManager.shared)
}
