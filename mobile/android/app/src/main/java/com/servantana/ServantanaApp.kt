package com.servantana

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class ServantanaApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)

            // Default channel
            val defaultChannel = NotificationChannel(
                "servantana_default",
                getString(R.string.notification_channel_default),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "General notifications"
            }

            // Bookings channel
            val bookingsChannel = NotificationChannel(
                "servantana_bookings",
                getString(R.string.notification_channel_bookings),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Booking updates and reminders"
                enableVibration(true)
            }

            // Messages channel
            val messagesChannel = NotificationChannel(
                "servantana_messages",
                getString(R.string.notification_channel_messages),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "New messages"
                enableVibration(true)
            }

            notificationManager.createNotificationChannels(
                listOf(defaultChannel, bookingsChannel, messagesChannel)
            )
        }
    }
}
