package com.servantana.app.data.repository

import com.servantana.app.data.api.ServantanaApi
import com.servantana.app.data.model.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class WorkerOnboardingRepository @Inject constructor(
    private val api: ServantanaApi
) {
    // Profile
    suspend fun getWorkerProfile(): Result<WorkerProfileResponse> = runCatching {
        api.getWorkerProfile()
    }

    suspend fun updateWorkerProfile(request: WorkerProfileUpdateRequest): Result<WorkerProfileUpdateResponse> = runCatching {
        api.updateWorkerProfile(request)
    }

    suspend fun completeOnboarding(): Result<OnboardingCompleteResponse> = runCatching {
        api.completeOnboarding()
    }

    // Professions
    suspend fun getCategories(): Result<CategoriesResponse> = runCatching {
        api.getCategories()
    }

    suspend fun getProfessions(categoryId: String? = null): Result<ProfessionsResponse> = runCatching {
        api.getProfessions(categoryId)
    }

    suspend fun getWorkerProfessions(): Result<WorkerProfessionsResponse> = runCatching {
        api.getWorkerProfessions()
    }

    suspend fun addWorkerProfession(professionId: String, isPrimary: Boolean): Result<WorkerProfessionsResponse> = runCatching {
        api.addWorkerProfession(AddProfessionRequest(professionId, isPrimary))
    }

    suspend fun removeWorkerProfession(professionId: String): Result<ApiResponse> = runCatching {
        api.removeWorkerProfession(professionId)
    }

    suspend fun setPrimaryProfession(professionId: String): Result<WorkerProfessionsResponse> = runCatching {
        api.setPrimaryProfession(UpdatePrimaryProfessionRequest(professionId))
    }

    // Availability
    suspend fun getWorkerAvailability(): Result<AvailabilityResponse> = runCatching {
        api.getWorkerAvailability()
    }

    suspend fun setWorkerAvailability(slots: List<AvailabilitySlotRequest>): Result<AvailabilityResponse> = runCatching {
        api.setWorkerAvailability(SetAvailabilityRequest(slots))
    }

    // Documents
    suspend fun getWorkerDocuments(): Result<DocumentsResponse> = runCatching {
        api.getWorkerDocuments()
    }

    suspend fun uploadDocument(file: File, mimeType: String, type: DocumentType, expiresAt: String? = null): Result<DocumentUploadResponse> = runCatching {
        val requestFile = file.asRequestBody(mimeType.toMediaType())
        val filePart = MultipartBody.Part.createFormData("file", file.name, requestFile)
        val typeBody = type.value.toRequestBody("text/plain".toMediaType())
        val expiresBody = expiresAt?.toRequestBody("text/plain".toMediaType())

        api.uploadDocument(filePart, typeBody, expiresBody)
    }

    suspend fun deleteDocument(documentId: String): Result<ApiResponse> = runCatching {
        api.deleteDocument(documentId)
    }

    // Stripe Connect
    suspend fun getStripeConnectStatus(): Result<StripeConnectStatus> = runCatching {
        api.getStripeConnectStatus()
    }

    suspend fun createStripeConnectAccount(country: String = "DE"): Result<StripeConnectLinkResponse> = runCatching {
        api.createStripeConnectAccount(CreateStripeAccountRequest(country))
    }

    suspend fun refreshStripeOnboardingLink(): Result<StripeConnectLinkResponse> = runCatching {
        api.refreshStripeOnboardingLink(RefreshStripeRequest())
    }

    suspend fun checkStripeConnectStatus(): Result<StripeConnectStatus> = runCatching {
        api.checkStripeConnectStatus(CheckStripeRequest())
    }
}
