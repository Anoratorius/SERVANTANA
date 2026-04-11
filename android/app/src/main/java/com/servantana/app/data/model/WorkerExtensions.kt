package com.servantana.app.data.model

// Extension properties for convenient access to worker profile data

val Worker.rating: Double
    get() = workerProfile?.averageRating ?: 0.0

val Worker.reviewCount: Int
    get() = workerProfile?.totalBookings ?: 0

val Worker.hourlyRate: Double?
    get() = workerProfile?.hourlyRate

val Worker.profession: String?
    get() = workerProfile?.professions?.firstOrNull { it.isPrimary }?.profession?.name
        ?: workerProfile?.professions?.firstOrNull()?.profession?.name

val Worker.isVerified: Boolean
    get() = workerProfile?.isVerified ?: false

val Worker.city: String?
    get() = workerProfile?.city

val Worker.bio: String?
    get() = workerProfile?.bio

val Worker.yearsExperience: Int
    get() = workerProfile?.yearsExperience ?: 0

val Worker.ecoFriendly: Boolean
    get() = workerProfile?.ecoFriendly ?: false

val Worker.petFriendly: Boolean
    get() = workerProfile?.petFriendly ?: false
