import SwiftUI

struct ReviewSubmissionView: View {
    let bookingId: String
    let onDismiss: () -> Void

    @StateObject private var viewModel: ReviewSubmissionViewModel
    @Environment(\.dismiss) private var dismiss

    init(bookingId: String, onDismiss: @escaping () -> Void) {
        self.bookingId = bookingId
        self.onDismiss = onDismiss
        _viewModel = StateObject(wrappedValue: ReviewSubmissionViewModel(bookingId: bookingId))
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Leave a Review")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            dismiss()
                        }
                    }
                }
                .onChange(of: viewModel.isSuccess) { _, success in
                    if success {
                        onDismiss()
                        dismiss()
                    }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoadingBooking {
            ProgressView()
        } else {
            ScrollView {
                VStack(spacing: 24) {
                    // Worker info
                    workerHeader

                    // Star rating
                    starRatingSection

                    // Comment
                    commentSection

                    // Error
                    if let error = viewModel.error {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                    }

                    // Submit button
                    submitButton

                    Spacer()
                }
                .padding()
            }
        }
    }

    private var workerHeader: some View {
        VStack(spacing: 12) {
            Circle()
                .fill(Color(.systemGray4))
                .frame(width: 80, height: 80)
                .overlay {
                    Image(systemName: "person.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.white)
                }

            Text(viewModel.workerName)
                .font(.title2)
                .fontWeight(.bold)

            Text(viewModel.serviceName)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var starRatingSection: some View {
        VStack(spacing: 12) {
            Text("How was your experience?")
                .font(.headline)

            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { star in
                    Button {
                        withAnimation(.easeInOut(duration: 0.15)) {
                            viewModel.rating = star
                        }
                    } label: {
                        Image(systemName: star <= viewModel.rating ? "star.fill" : "star")
                            .font(.system(size: 40))
                            .foregroundStyle(star <= viewModel.rating ? .yellow : Color(.systemGray3))
                    }
                }
            }

            Text(ratingDescription)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical)
    }

    private var ratingDescription: String {
        switch viewModel.rating {
        case 1: return "Poor"
        case 2: return "Fair"
        case 3: return "Good"
        case 4: return "Very Good"
        case 5: return "Excellent"
        default: return ""
        }
    }

    private var commentSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Share your experience (optional)")
                .font(.headline)

            TextEditor(text: $viewModel.comment)
                .frame(height: 120)
                .padding(8)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(.systemGray4), lineWidth: 1)
                )

            Text("\(viewModel.comment.count)/500")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }

    private var submitButton: some View {
        Button {
            Task {
                await viewModel.submitReview()
            }
        } label: {
            HStack {
                if viewModel.isSubmitting {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "paperplane.fill")
                    Text("Submit Review")
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.accentColor)
            .foregroundStyle(.white)
            .cornerRadius(12)
        }
        .disabled(viewModel.isSubmitting || !viewModel.isFormValid)
    }
}

#Preview {
    ReviewSubmissionView(bookingId: "1") { }
}
