package com.servantana.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.servantana.data.api.ServantanaApi
import com.servantana.data.model.LoginRequest
import com.servantana.data.model.RegisterRequest
import com.servantana.data.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthState {
    object Loading : AuthState()
    object Unauthenticated : AuthState()
    data class Authenticated(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
}

@Singleton
class AuthRepository @Inject constructor(
    private val api: ServantanaApi,
    private val dataStore: DataStore<Preferences>,
    private val json: Json
) {
    companion object {
        val AUTH_TOKEN_KEY = stringPreferencesKey("auth_token")
        private val USER_KEY = stringPreferencesKey("user")
    }

    // Flow of current auth state
    val authState: Flow<AuthState> = dataStore.data.map { prefs ->
        val token = prefs[AUTH_TOKEN_KEY]
        val userJson = prefs[USER_KEY]

        if (token != null && userJson != null) {
            try {
                val user = json.decodeFromString<User>(userJson)
                AuthState.Authenticated(user)
            } catch (e: Exception) {
                AuthState.Unauthenticated
            }
        } else {
            AuthState.Unauthenticated
        }
    }

    // Get current user synchronously (for checking)
    suspend fun getCurrentUser(): User? {
        val prefs = dataStore.data.first()
        val userJson = prefs[USER_KEY] ?: return null
        return try {
            json.decodeFromString<User>(userJson)
        } catch (e: Exception) {
            null
        }
    }

    // Check if user is logged in
    suspend fun isLoggedIn(): Boolean {
        val prefs = dataStore.data.first()
        return prefs[AUTH_TOKEN_KEY] != null
    }

    // Login
    suspend fun login(email: String, password: String): Result<User> {
        return try {
            val response = api.login(LoginRequest(email, password))

            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                saveAuthData(authResponse.token, authResponse.user)
                Result.success(authResponse.user)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.failure(Exception(errorBody ?: "Login failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Register
    suspend fun register(
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        phone: String? = null,
        role: String = "CUSTOMER"
    ): Result<User> {
        return try {
            val request = RegisterRequest(
                email = email,
                password = password,
                firstName = firstName,
                lastName = lastName,
                phone = phone,
                role = role
            )
            val response = api.register(request)

            if (response.isSuccessful && response.body() != null) {
                val authResponse = response.body()!!
                saveAuthData(authResponse.token, authResponse.user)
                Result.success(authResponse.user)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.failure(Exception(errorBody ?: "Registration failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Logout
    suspend fun logout() {
        try {
            api.logout()
        } catch (e: Exception) {
            // Ignore API errors on logout
        }
        clearAuthData()
    }

    // Refresh session
    suspend fun refreshSession(): Result<User> {
        return try {
            val response = api.getSession()
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                // Update stored user
                dataStore.edit { prefs ->
                    prefs[USER_KEY] = json.encodeToString(user)
                }
                Result.success(user)
            } else {
                // Session invalid, clear auth
                clearAuthData()
                Result.failure(Exception("Session expired"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Save auth data to DataStore
    private suspend fun saveAuthData(token: String, user: User) {
        dataStore.edit { prefs ->
            prefs[AUTH_TOKEN_KEY] = token
            prefs[USER_KEY] = json.encodeToString(user)
        }
    }

    // Clear auth data
    private suspend fun clearAuthData() {
        dataStore.edit { prefs ->
            prefs.remove(AUTH_TOKEN_KEY)
            prefs.remove(USER_KEY)
        }
    }
}
