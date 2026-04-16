package com.servantana.app.ui.screens.worker.onboarding

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.servantana.app.data.model.*
import com.servantana.app.data.repository.WorkerOnboardingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import javax.inject.Inject

enum class OnboardingStep(val title: String, val description: String) {
    PROFILE("Profile", "Set up your professional profile"),
    PROFESSIONS("Services", "Select the services you offer"),
    AVAILABILITY("Schedule", "Set your working hours"),
    DOCUMENTS("Documents", "Upload verification documents"),
    STRIPE_CONNECT("Payments", "Connect your payment account"),
    GO_LIVE("Go Live", "Review and start receiving bookings")
}

data class DayAvailability(
    val dayOfWeek: Int,
    val dayName: String,
    var isEnabled: Boolean,
    var startTime: LocalTime,
    var endTime: LocalTime
)

data class OnboardingUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val currentStep: OnboardingStep = OnboardingStep.PROFILE,

    // Profile
    val firstName: String = "",
    val lastName: String = "",
    val phone: String = "",
    val bio: String = "",
    val hourlyRate: Double = 25.0,
    val experienceYears: Int = 0,
    val city: String = "",
    val country: String = "DE",
    val serviceRadius: Int = 25,
    val ecoFriendly: Boolean = false,
    val petFriendly: Boolean = false,
    val profileComplete: Boolean = false,

    // Professions
    val categories: List<Category> = emptyList(),
    val availableProfessions: List<Profession> = emptyList(),
    val selectedProfessions: Set<String> = emptySet(),
    val primaryProfessionId: String? = null,
    val workerProfessions: List<WorkerProfessionDetail> = emptyList(),
    val professionsComplete: Boolean = false,

    // Availability
    val availability: List<DayAvailability> = emptyList(),
    val availabilityComplete: Boolean = false,

    // Documents
    val documents: List<WorkerDocument> = emptyList(),
    val isUploadingDocument: Boolean = false,
    val documentsComplete: Boolean = false,

    // Stripe
    val stripeStatus: StripeConnectStatus? = null,
    val stripeOnboardingUrl: String? = null,
    val stripeComplete: Boolean = false,

    // Go Live
    val onboardingSuccess: Boolean = false
)

@HiltViewModel
class WorkerOnboardingViewModel @Inject constructor(
    private val repository: WorkerOnboardingRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    init {
        initializeAvailability()
        loadInitialData()
    }

    private fun initializeAvailability() {
        val days = listOf("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")
        val availability = days.mapIndexed { index, name ->
            DayAvailability(
                dayOfWeek = index,
                dayName = name,
                isEnabled = index in 1..5, // Mon-Fri enabled by default
                startTime = LocalTime.of(9, 0),
                endTime = LocalTime.of(17, 0)
            )
        }
        _uiState.value = _uiState.value.copy(availability = availability)
    }

    fun loadInitialData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            try {
                // Load profile
                repository.getWorkerProfile().onSuccess { profileResponse ->
                    _uiState.value = _uiState.value.copy(
                        firstName = profileResponse.user.firstName,
                        lastName = profileResponse.user.lastName,
                        phone = profileResponse.user.phone ?: ""
                    )

                    profileResponse.profile?.let { profile ->
                        _uiState.value = _uiState.value.copy(
                            bio = profile.bio ?: "",
                            hourlyRate = profile.hourlyRate,
                            experienceYears = profile.experienceYears ?: 0,
                            city = profile.city ?: "",
                            country = profile.country ?: "DE",
                            serviceRadius = profile.serviceRadius ?: 25,
                            ecoFriendly = profile.ecoFriendly,
                            petFriendly = profile.petFriendly
                        )

                        // Load professions
                        profile.professions?.let { profs ->
                            _uiState.value = _uiState.value.copy(
                                workerProfessions = profs,
                                selectedProfessions = profs.map { it.professionId }.toSet(),
                                primaryProfessionId = profs.find { it.isPrimary }?.professionId
                            )
                        }

                        // Load availability
                        profile.availability?.let { serverAvail ->
                            val updatedAvailability = _uiState.value.availability.map { day ->
                                serverAvail.find { it.dayOfWeek == day.dayOfWeek }?.let { slot ->
                                    day.copy(
                                        isEnabled = slot.isEnabled,
                                        startTime = parseTime(slot.startTime) ?: day.startTime,
                                        endTime = parseTime(slot.endTime) ?: day.endTime
                                    )
                                } ?: day
                            }
                            _uiState.value = _uiState.value.copy(availability = updatedAvailability)
                        }
                    }
                }

                // Load categories and professions
                repository.getCategories().onSuccess { response ->
                    _uiState.value = _uiState.value.copy(categories = response.categories)
                }

                repository.getProfessions().onSuccess { response ->
                    _uiState.value = _uiState.value.copy(availableProfessions = response.professions)
                }

                // Load documents
                repository.getWorkerDocuments().onSuccess { response ->
                    _uiState.value = _uiState.value.copy(documents = response.documents)
                }

                // Load Stripe status
                repository.getStripeConnectStatus().onSuccess { status ->
                    _uiState.value = _uiState.value.copy(
                        stripeStatus = status,
                        stripeComplete = status.onboardingComplete
                    )
                }

                updateCompletionStatus()

            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    private fun updateCompletionStatus() {
        val state = _uiState.value
        _uiState.value = state.copy(
            profileComplete = state.bio.isNotEmpty() && state.hourlyRate > 0 && state.city.isNotEmpty(),
            professionsComplete = state.selectedProfessions.isNotEmpty() && state.primaryProfessionId != null,
            availabilityComplete = state.availability.any { it.isEnabled },
            documentsComplete = state.documents.any { it.status == "VERIFIED" || it.status == "PENDING" }
        )
    }

    // Profile updates
    fun updateFirstName(value: String) {
        _uiState.value = _uiState.value.copy(firstName = value)
    }

    fun updateLastName(value: String) {
        _uiState.value = _uiState.value.copy(lastName = value)
    }

    fun updatePhone(value: String) {
        _uiState.value = _uiState.value.copy(phone = value)
    }

    fun updateBio(value: String) {
        _uiState.value = _uiState.value.copy(bio = value)
    }

    fun updateHourlyRate(value: Double) {
        _uiState.value = _uiState.value.copy(hourlyRate = value)
    }

    fun updateExperienceYears(value: Int) {
        _uiState.value = _uiState.value.copy(experienceYears = value)
    }

    fun updateCity(value: String) {
        _uiState.value = _uiState.value.copy(city = value)
    }

    fun updateCountry(value: String) {
        _uiState.value = _uiState.value.copy(country = value)
    }

    fun updateServiceRadius(value: Int) {
        _uiState.value = _uiState.value.copy(serviceRadius = value)
    }

    fun updateEcoFriendly(value: Boolean) {
        _uiState.value = _uiState.value.copy(ecoFriendly = value)
    }

    fun updatePetFriendly(value: Boolean) {
        _uiState.value = _uiState.value.copy(petFriendly = value)
    }

    fun saveProfile(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val state = _uiState.value
            val request = WorkerProfileUpdateRequest(
                firstName = state.firstName,
                lastName = state.lastName,
                phone = state.phone.ifEmpty { null },
                bio = state.bio.ifEmpty { null },
                hourlyRate = state.hourlyRate,
                experienceYears = state.experienceYears,
                ecoFriendly = state.ecoFriendly,
                petFriendly = state.petFriendly,
                city = state.city.ifEmpty { null },
                country = state.country.ifEmpty { null },
                serviceRadius = state.serviceRadius
            )

            repository.updateWorkerProfile(request)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(profileComplete = true)
                    onSuccess()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(error = e.message)
                }

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    // Professions
    fun toggleProfession(professionId: String) {
        val current = _uiState.value.selectedProfessions.toMutableSet()
        var primaryId = _uiState.value.primaryProfessionId

        if (current.contains(professionId)) {
            current.remove(professionId)
            if (primaryId == professionId) {
                primaryId = current.firstOrNull()
            }
        } else {
            current.add(professionId)
            if (primaryId == null) {
                primaryId = professionId
            }
        }

        _uiState.value = _uiState.value.copy(
            selectedProfessions = current,
            primaryProfessionId = primaryId
        )
    }

    fun setPrimaryProfession(professionId: String) {
        _uiState.value = _uiState.value.copy(primaryProfessionId = professionId)
    }

    fun saveProfessions(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            try {
                val currentIds = _uiState.value.workerProfessions.map { it.professionId }.toSet()
                val selectedIds = _uiState.value.selectedProfessions
                val primaryId = _uiState.value.primaryProfessionId

                // Remove professions no longer selected
                for (profId in currentIds - selectedIds) {
                    repository.removeWorkerProfession(profId)
                }

                // Add new professions
                for (profId in selectedIds - currentIds) {
                    repository.addWorkerProfession(profId, profId == primaryId)
                }

                // Set primary
                primaryId?.let {
                    repository.setPrimaryProfession(it)
                }

                // Refresh professions
                repository.getWorkerProfessions().onSuccess { response ->
                    _uiState.value = _uiState.value.copy(
                        workerProfessions = response.professions,
                        professionsComplete = true
                    )
                }

                onSuccess()
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(error = e.message)
            }

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    // Availability
    fun toggleDay(dayOfWeek: Int) {
        val updated = _uiState.value.availability.map { day ->
            if (day.dayOfWeek == dayOfWeek) day.copy(isEnabled = !day.isEnabled) else day
        }
        _uiState.value = _uiState.value.copy(availability = updated)
    }

    fun updateDayTime(dayOfWeek: Int, startTime: LocalTime?, endTime: LocalTime?) {
        val updated = _uiState.value.availability.map { day ->
            if (day.dayOfWeek == dayOfWeek) {
                day.copy(
                    startTime = startTime ?: day.startTime,
                    endTime = endTime ?: day.endTime
                )
            } else day
        }
        _uiState.value = _uiState.value.copy(availability = updated)
    }

    fun setWeekdays() {
        val updated = _uiState.value.availability.map { day ->
            day.copy(isEnabled = day.dayOfWeek in 1..5)
        }
        _uiState.value = _uiState.value.copy(availability = updated)
    }

    fun setEveryDay() {
        val updated = _uiState.value.availability.map { day ->
            day.copy(isEnabled = true)
        }
        _uiState.value = _uiState.value.copy(availability = updated)
    }

    fun clearAvailability() {
        val updated = _uiState.value.availability.map { day ->
            day.copy(isEnabled = false)
        }
        _uiState.value = _uiState.value.copy(availability = updated)
    }

    fun saveAvailability(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            val formatter = DateTimeFormatter.ofPattern("HH:mm")
            val slots = _uiState.value.availability.map { day ->
                AvailabilitySlotRequest(
                    dayOfWeek = day.dayOfWeek,
                    startTime = day.startTime.format(formatter),
                    endTime = day.endTime.format(formatter),
                    isEnabled = day.isEnabled
                )
            }

            repository.setWorkerAvailability(slots)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(availabilityComplete = true)
                    onSuccess()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(error = e.message)
                }

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    // Documents
    fun uploadDocument(file: File, mimeType: String, type: DocumentType, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isUploadingDocument = true, error = null)

            repository.uploadDocument(file, mimeType, type)
                .onSuccess { response ->
                    val updated = _uiState.value.documents + response.document
                    _uiState.value = _uiState.value.copy(
                        documents = updated,
                        documentsComplete = true
                    )
                    onSuccess()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(error = e.message)
                }

            _uiState.value = _uiState.value.copy(isUploadingDocument = false)
        }
    }

    fun refreshDocuments() {
        viewModelScope.launch {
            repository.getWorkerDocuments().onSuccess { response ->
                _uiState.value = _uiState.value.copy(
                    documents = response.documents,
                    documentsComplete = response.documents.any { it.status == "VERIFIED" || it.status == "PENDING" }
                )
            }
        }
    }

    // Stripe Connect
    fun createStripeAccount(onSuccess: (String) -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.createStripeConnectAccount(_uiState.value.country)
                .onSuccess { response ->
                    _uiState.value = _uiState.value.copy(stripeOnboardingUrl = response.url)
                    onSuccess(response.url)
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(error = e.message)
                }

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun refreshStripeStatus() {
        viewModelScope.launch {
            repository.checkStripeConnectStatus().onSuccess { status ->
                _uiState.value = _uiState.value.copy(
                    stripeStatus = status,
                    stripeComplete = status.onboardingComplete
                )
            }
        }
    }

    // Navigation
    fun goToStep(step: OnboardingStep) {
        _uiState.value = _uiState.value.copy(currentStep = step)
    }

    fun nextStep() {
        val currentIndex = OnboardingStep.entries.indexOf(_uiState.value.currentStep)
        if (currentIndex < OnboardingStep.entries.size - 1) {
            _uiState.value = _uiState.value.copy(currentStep = OnboardingStep.entries[currentIndex + 1])
        }
    }

    fun previousStep() {
        val currentIndex = OnboardingStep.entries.indexOf(_uiState.value.currentStep)
        if (currentIndex > 0) {
            _uiState.value = _uiState.value.copy(currentStep = OnboardingStep.entries[currentIndex - 1])
        }
    }

    // Complete onboarding
    fun completeOnboarding(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.completeOnboarding()
                .onSuccess { response ->
                    if (response.onboardingComplete) {
                        _uiState.value = _uiState.value.copy(onboardingSuccess = true)
                        onSuccess()
                    }
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(error = e.message)
                }

            _uiState.value = _uiState.value.copy(isLoading = false)
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    private fun parseTime(timeString: String): LocalTime? {
        return try {
            LocalTime.parse(timeString, DateTimeFormatter.ofPattern("HH:mm"))
        } catch (e: Exception) {
            null
        }
    }
}
