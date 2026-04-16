package com.servantana.app.service

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.os.Looper
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class LocationData(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null,
    val city: String? = null,
    val country: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

sealed class LocationResult {
    data class Success(val location: LocationData) : LocationResult()
    data class Error(val message: String) : LocationResult()
    object PermissionDenied : LocationResult()
    object Loading : LocationResult()
}

@Singleton
class LocationService @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    private val _currentLocation = MutableStateFlow<LocationData?>(null)
    val currentLocation: StateFlow<LocationData?> = _currentLocation

    private val _isUpdating = MutableStateFlow(false)
    val isUpdating: StateFlow<Boolean> = _isUpdating

    private var locationCallback: LocationCallback? = null

    // Check if location permissions are granted
    fun hasLocationPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
    }

    // Get permissions needed for location
    fun getRequiredPermissions(): Array<String> {
        return arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    }

    // Get current location as a one-shot request
    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): LocationResult {
        if (!hasLocationPermission()) {
            return LocationResult.PermissionDenied
        }

        return suspendCancellableCoroutine { continuation ->
            val cancellationToken = com.google.android.gms.tasks.CancellationTokenSource()

            fusedLocationClient.getCurrentLocation(
                Priority.PRIORITY_HIGH_ACCURACY,
                cancellationToken.token
            ).addOnSuccessListener { location: Location? ->
                if (location != null) {
                    val locationData = LocationData(
                        latitude = location.latitude,
                        longitude = location.longitude,
                        accuracy = location.accuracy
                    )
                    _currentLocation.value = locationData
                    continuation.resume(LocationResult.Success(locationData))
                } else {
                    continuation.resume(LocationResult.Error("Unable to get location"))
                }
            }.addOnFailureListener { exception ->
                continuation.resume(LocationResult.Error(exception.message ?: "Location error"))
            }

            continuation.invokeOnCancellation {
                cancellationToken.cancel()
            }
        }
    }

    // Get location with geocoding (city/country)
    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocationWithGeocoding(): LocationResult {
        val result = getCurrentLocation()

        if (result is LocationResult.Success) {
            val geocodedLocation = reverseGeocode(result.location.latitude, result.location.longitude)
            return LocationResult.Success(
                result.location.copy(
                    city = geocodedLocation?.city,
                    country = geocodedLocation?.country
                )
            )
        }

        return result
    }

    // Reverse geocode to get city and country
    @Suppress("DEPRECATION")
    private fun reverseGeocode(latitude: Double, longitude: Double): GeocodedAddress? {
        return try {
            val geocoder = Geocoder(context, Locale.getDefault())
            val addresses = geocoder.getFromLocation(latitude, longitude, 1)
            addresses?.firstOrNull()?.let { address ->
                GeocodedAddress(
                    city = address.locality ?: address.subAdminArea,
                    country = address.countryName
                )
            }
        } catch (e: Exception) {
            null
        }
    }

    // Start continuous location updates
    @SuppressLint("MissingPermission")
    fun startLocationUpdates(): Flow<LocationData> = callbackFlow {
        if (!hasLocationPermission()) {
            close(SecurityException("Location permission not granted"))
            return@callbackFlow
        }

        val locationRequest = LocationRequest.Builder(
            Priority.PRIORITY_HIGH_ACCURACY,
            10000L // Update interval: 10 seconds
        ).apply {
            setMinUpdateIntervalMillis(5000L) // Fastest interval: 5 seconds
            setMinUpdateDistanceMeters(50f) // Minimum displacement: 50 meters
        }.build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.locations.lastOrNull()?.let { location ->
                    val locationData = LocationData(
                        latitude = location.latitude,
                        longitude = location.longitude,
                        accuracy = location.accuracy
                    )
                    _currentLocation.value = locationData
                    trySend(locationData)
                }
            }
        }

        _isUpdating.value = true
        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback!!,
            Looper.getMainLooper()
        )

        awaitClose {
            stopLocationUpdates()
        }
    }

    // Stop location updates
    fun stopLocationUpdates() {
        locationCallback?.let {
            fusedLocationClient.removeLocationUpdates(it)
            locationCallback = null
        }
        _isUpdating.value = false
    }

    // Calculate distance between two points in km
    fun calculateDistance(
        lat1: Double, lon1: Double,
        lat2: Double, lon2: Double
    ): Float {
        val results = FloatArray(1)
        Location.distanceBetween(lat1, lon1, lat2, lon2, results)
        return results[0] / 1000f // Convert to km
    }

    // Calculate distance from current location to a point
    fun distanceTo(latitude: Double, longitude: Double): Float? {
        val current = _currentLocation.value ?: return null
        return calculateDistance(current.latitude, current.longitude, latitude, longitude)
    }

    private data class GeocodedAddress(
        val city: String?,
        val country: String?
    )
}
