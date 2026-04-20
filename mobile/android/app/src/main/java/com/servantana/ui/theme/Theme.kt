package com.servantana.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Brand colors
val Primary = Color(0xFF2563EB) // Blue-600
val PrimaryVariant = Color(0xFF1D4ED8) // Blue-700
val Secondary = Color(0xFF10B981) // Emerald-500
val SecondaryVariant = Color(0xFF059669) // Emerald-600

// Light theme colors
private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDBEAFE), // Blue-100
    onPrimaryContainer = Color(0xFF1E3A5F),
    secondary = Secondary,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFD1FAE5), // Emerald-100
    onSecondaryContainer = Color(0xFF064E3B),
    tertiary = Color(0xFF8B5CF6), // Violet-500
    onTertiary = Color.White,
    background = Color(0xFFF9FAFB), // Gray-50
    onBackground = Color(0xFF111827), // Gray-900
    surface = Color.White,
    onSurface = Color(0xFF111827),
    surfaceVariant = Color(0xFFF3F4F6), // Gray-100
    onSurfaceVariant = Color(0xFF4B5563), // Gray-600
    error = Color(0xFFDC2626), // Red-600
    onError = Color.White,
    outline = Color(0xFFD1D5DB), // Gray-300
)

// Dark theme colors
private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF60A5FA), // Blue-400
    onPrimary = Color(0xFF1E3A5F),
    primaryContainer = Color(0xFF1E40AF), // Blue-800
    onPrimaryContainer = Color(0xFFDBEAFE),
    secondary = Color(0xFF34D399), // Emerald-400
    onSecondary = Color(0xFF064E3B),
    secondaryContainer = Color(0xFF065F46), // Emerald-800
    onSecondaryContainer = Color(0xFFD1FAE5),
    tertiary = Color(0xFFA78BFA), // Violet-400
    onTertiary = Color.White,
    background = Color(0xFF111827), // Gray-900
    onBackground = Color(0xFFF9FAFB), // Gray-50
    surface = Color(0xFF1F2937), // Gray-800
    onSurface = Color(0xFFF9FAFB),
    surfaceVariant = Color(0xFF374151), // Gray-700
    onSurfaceVariant = Color(0xFF9CA3AF), // Gray-400
    error = Color(0xFFF87171), // Red-400
    onError = Color.Black,
    outline = Color(0xFF4B5563), // Gray-600
)

@Composable
fun ServantanaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
