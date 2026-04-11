package com.servantana.app.service

import android.content.Context
import android.os.Build
import com.google.firebase.messaging.FirebaseMessaging
import com.servantana.app.data.api.ServantanaApi
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.tasks.await
import kotlinx.serialization.Serializable
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class RegisterTokenRequest(
    val token: String,
    val platform: String,
    val deviceName: String?,
    val deviceModel: String?,
    val appVersion: String?
)

@Serializable
data class RegisterTokenResponse(
    val success: Boolean,
    val tokenId: String? = null
)

@Singleton
class NotificationRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ServantanaApi
) {
    suspend fun registerDeviceToken(token: String): Result<Unit> {
        return try {
            val request = RegisterTokenRequest(
                token = token,
                platform = "android",
                deviceName = Build.MODEL,
                deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}",
                appVersion = getAppVersion()
            )

            api.registerDeviceToken(request)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getCurrentToken(): String? {
        return try {
            FirebaseMessaging.getInstance().token.await()
        } catch (e: Exception) {
            null
        }
    }

    suspend fun refreshAndRegisterToken(): Result<Unit> {
        val token = getCurrentToken() ?: return Result.failure(Exception("No token"))
        return registerDeviceToken(token)
    }

    suspend fun unregisterToken(): Result<Unit> {
        return try {
            val token = getCurrentToken() ?: return Result.failure(Exception("No token"))
            api.unregisterDeviceToken(token)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun getAppVersion(): String {
        return try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }
}
