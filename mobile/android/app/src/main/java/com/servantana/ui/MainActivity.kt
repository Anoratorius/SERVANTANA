package com.servantana.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.servantana.data.repository.AuthState
import com.servantana.ui.screens.auth.LoginScreen
import com.servantana.ui.screens.auth.RegisterScreen
import com.servantana.ui.screens.booking.BookServiceScreen
import com.servantana.ui.screens.bookings.BookingDetailScreen
import com.servantana.ui.screens.bookings.BookingsScreen
import com.servantana.ui.screens.home.HomeScreen
import com.servantana.ui.screens.messages.ConversationScreen
import com.servantana.ui.screens.messages.MessagesScreen
import com.servantana.ui.screens.profile.ProfileScreen
import com.servantana.ui.screens.search.SearchScreen
import com.servantana.ui.screens.splash.SplashScreen
import com.servantana.ui.screens.tracking.TrackingScreen
import com.servantana.ui.screens.worker.WorkerDashboardScreen
import com.servantana.ui.screens.worker.WorkerProfileScreen
import com.servantana.ui.theme.ServantanaTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            ServantanaTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    ServantanaApp()
                }
            }
        }
    }
}

// Navigation routes
object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val HOME = "home"
    const val SEARCH = "search"
    const val BOOKINGS = "bookings"
    const val BOOKING_DETAIL = "booking/{bookingId}"
    const val TRACKING = "tracking/{bookingId}"
    const val MESSAGES = "messages"
    const val CONVERSATION = "conversation/{partnerId}"
    const val PROFILE = "profile"
    const val WORKER_DASHBOARD = "worker/dashboard"
    const val WORKER_PROFILE = "worker/{workerId}"
    const val BOOK_SERVICE = "book/{workerId}"
}

@Composable
fun ServantanaApp(
    viewModel: MainViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val authState by viewModel.authState.collectAsState()

    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH
    ) {
        // Splash Screen
        composable(Routes.SPLASH) {
            SplashScreen(
                onNavigateToLogin = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                },
                onNavigateToHome = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                },
                authState = authState
            )
        }

        // Auth Screens
        composable(Routes.LOGIN) {
            LoginScreen(
                onNavigateToRegister = {
                    navController.navigate(Routes.REGISTER)
                },
                onLoginSuccess = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.REGISTER) {
            RegisterScreen(
                onNavigateToLogin = {
                    navController.popBackStack()
                },
                onRegisterSuccess = {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.REGISTER) { inclusive = true }
                    }
                }
            )
        }

        // Main App
        composable(Routes.HOME) {
            HomeScreen(
                navController = navController,
                onLogout = {
                    viewModel.logout()
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                }
            )
        }

        // Search
        composable(Routes.SEARCH) {
            SearchScreen(navController = navController)
        }

        // Bookings
        composable(Routes.BOOKINGS) {
            BookingsScreen(navController = navController)
        }

        composable(Routes.BOOKING_DETAIL) {
            BookingDetailScreen(navController = navController)
        }

        // Tracking
        composable(Routes.TRACKING) {
            TrackingScreen(navController = navController)
        }

        // Messages
        composable(Routes.MESSAGES) {
            MessagesScreen(navController = navController)
        }

        composable(Routes.CONVERSATION) {
            ConversationScreen(navController = navController)
        }

        // Profile
        composable(Routes.PROFILE) {
            ProfileScreen(
                navController = navController,
                onLogout = {
                    viewModel.logout()
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                }
            )
        }

        // Worker screens
        composable(Routes.WORKER_DASHBOARD) {
            WorkerDashboardScreen(navController = navController)
        }

        composable(Routes.WORKER_PROFILE) {
            WorkerProfileScreen(navController = navController)
        }

        // Booking flow
        composable(Routes.BOOK_SERVICE) {
            BookServiceScreen(navController = navController)
        }
    }
}
