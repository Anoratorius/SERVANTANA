package com.servantana.app.data.repository

import com.servantana.app.data.api.ServantanaApi
import com.servantana.app.data.model.PaymentIntentRequest
import com.servantana.app.data.model.PaymentIntentResponse
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentRepository @Inject constructor(
    private val api: ServantanaApi
) {
    suspend fun createPaymentIntent(bookingId: String): Result<PaymentIntentResponse> {
        return try {
            val response = api.createPaymentIntent(PaymentIntentRequest(bookingId))
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
