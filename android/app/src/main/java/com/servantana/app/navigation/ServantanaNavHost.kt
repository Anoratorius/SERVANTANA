package com.servantana.app.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.servantana.app.ui.components.BottomNavBar
import com.servantana.app.ui.screens.ai.AIChatScreen
import com.servantana.app.ui.screens.ai.ReviewInsightsScreen
import com.servantana.app.ui.screens.ai.SmartMatchScreen
import com.servantana.app.ui.screens.ai.SmartScheduleScreen
import com.servantana.app.ui.screens.reviews.ReviewSubmissionScreen
import com.servantana.app.ui.screens.invoices.InvoicesScreen
import com.servantana.app.ui.screens.properties.PropertiesScreen
import com.servantana.app.ui.screens.properties.PropertyDetailScreen
import com.servantana.app.ui.screens.auth.ForgotPasswordScreen
import com.servantana.app.ui.screens.auth.LoginScreen
import com.servantana.app.ui.screens.auth.SignUpScreen
import com.servantana.app.ui.screens.booking.BookingDetailScreen
import com.servantana.app.ui.screens.booking.BookingsScreen
import com.servantana.app.ui.screens.booking.CreateBookingScreen
import com.servantana.app.ui.payment.PaymentScreen
import com.servantana.app.ui.screens.favorites.FavoritesScreen
import com.servantana.app.ui.screens.home.HomeScreen
import com.servantana.app.ui.screens.messages.ChatScreen
import com.servantana.app.ui.screens.messages.MessagesScreen
import com.servantana.app.ui.screens.profile.EditProfileScreen
import com.servantana.app.ui.screens.profile.ProfileScreen
import com.servantana.app.ui.screens.search.SearchScreen
import com.servantana.app.ui.screens.search.WorkerProfileScreen
import com.servantana.app.ui.screens.settings.NotificationSettingsScreen
import com.servantana.app.ui.screens.settings.SecuritySettingsScreen
import com.servantana.app.ui.screens.settings.SettingsScreen
import com.servantana.app.ui.screens.worker.RouteOptimizerScreen
import com.servantana.app.ui.screens.worker.WorkerAvailabilityScreen
import com.servantana.app.ui.screens.worker.WorkerDashboardScreen
import com.servantana.app.ui.screens.worker.WorkerEarningsScreen
import com.servantana.app.ui.screens.MainViewModel

@Composable
fun ServantanaNavHost(
    viewModel: MainViewModel = hiltViewModel()
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val isAuthenticated by viewModel.isAuthenticated.collectAsState()

    // Routes that show bottom navigation
    val bottomNavRoutes = listOf(
        Home::class.qualifiedName,
        Search::class.qualifiedName,
        Bookings::class.qualifiedName,
        Messages::class.qualifiedName,
        Profile::class.qualifiedName
    )

    val showBottomNav = currentRoute in bottomNavRoutes && isAuthenticated

    Scaffold(
        bottomBar = {
            if (showBottomNav) {
                BottomNavBar(
                    navController = navController,
                    currentRoute = currentRoute
                )
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = if (isAuthenticated) Home else Login,
            modifier = Modifier.padding(paddingValues),
            enterTransition = {
                slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(300)
                )
            },
            exitTransition = {
                slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(300)
                )
            },
            popEnterTransition = {
                slideIntoContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(300)
                )
            },
            popExitTransition = {
                slideOutOfContainer(
                    towards = AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(300)
                )
            }
        ) {
            // Auth
            composable<Login> {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Home) {
                            popUpTo(Login) { inclusive = true }
                        }
                    },
                    onNavigateToSignUp = { navController.navigate(SignUp) },
                    onNavigateToForgotPassword = { navController.navigate(ForgotPassword) }
                )
            }

            composable<SignUp> {
                SignUpScreen(
                    onSignUpSuccess = {
                        navController.navigate(Home) {
                            popUpTo(Login) { inclusive = true }
                        }
                    },
                    onNavigateToLogin = { navController.popBackStack() }
                )
            }

            composable<ForgotPassword> {
                ForgotPasswordScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Main Tabs
            composable<Home> {
                HomeScreen(
                    onNavigateToSearch = { navController.navigate(Search) },
                    onNavigateToWorker = { workerId ->
                        navController.navigate(WorkerProfile(workerId))
                    },
                    onNavigateToAI = { navController.navigate(AIAssistant) },
                    onNavigateToSmartMatch = { lat, lng ->
                        navController.navigate(SmartMatch(lat, lng))
                    }
                )
            }

            composable<Search> {
                SearchScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToWorker = { workerId ->
                        navController.navigate(WorkerProfile(workerId))
                    }
                )
            }

            composable<Bookings> {
                BookingsScreen(
                    onNavigateToBooking = { bookingId ->
                        navController.navigate(BookingDetail(bookingId))
                    }
                )
            }

            composable<Messages> {
                MessagesScreen(
                    onNavigateToChat = { userId ->
                        navController.navigate(Chat(userId))
                    }
                )
            }

            composable<Profile> {
                ProfileScreen(
                    onNavigateToEditProfile = { navController.navigate(EditProfile) },
                    onNavigateToFavorites = { navController.navigate(Favorites) },
                    onNavigateToSettings = { navController.navigate(Settings) },
                    onLogout = {
                        viewModel.logout()
                        navController.navigate(Login) {
                            popUpTo(Home) { inclusive = true }
                        }
                    }
                )
            }

            composable<EditProfile> {
                EditProfileScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable<Favorites> {
                FavoritesScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToWorker = { workerId ->
                        navController.navigate(WorkerProfile(workerId))
                    }
                )
            }

            composable<Settings> {
                SettingsScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToNotifications = { navController.navigate(NotificationSettings) },
                    onNavigateToSecurity = { navController.navigate(SecuritySettings) },
                    onLogout = {
                        viewModel.logout()
                        navController.navigate(Login) {
                            popUpTo(Home) { inclusive = true }
                        }
                    }
                )
            }

            composable<NotificationSettings> {
                NotificationSettingsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable<SecuritySettings> {
                SecuritySettingsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Worker screens
            composable<WorkerDashboard> {
                WorkerDashboardScreen(
                    onNavigateToBooking = { bookingId ->
                        navController.navigate(BookingDetail(bookingId))
                    },
                    onNavigateToEarnings = { navController.navigate(WorkerEarnings) },
                    onNavigateToAvailability = { navController.navigate(WorkerAvailability) },
                    onNavigateToRouteOptimizer = { navController.navigate(RouteOptimizer) }
                )
            }

            composable<WorkerEarnings> {
                WorkerEarningsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable<WorkerAvailability> {
                WorkerAvailabilityScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable<RouteOptimizer> {
                RouteOptimizerScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Worker & Booking screens
            composable<WorkerProfile> {
                WorkerProfileScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToBooking = { workerId ->
                        navController.navigate(CreateBooking(workerId))
                    },
                    onNavigateToChat = { userId ->
                        navController.navigate(Chat(userId))
                    }
                )
            }

            composable<CreateBooking> {
                CreateBookingScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onBookingSuccess = {
                        navController.navigate(Bookings) {
                            popUpTo(Home)
                        }
                    },
                    onNavigateToPayment = { bookingId ->
                        navController.navigate(Payment(bookingId)) {
                            popUpTo(Home)
                        }
                    }
                )
            }

            composable<Payment> {
                PaymentScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onPaymentSuccess = {
                        navController.navigate(Bookings) {
                            popUpTo(Home)
                        }
                    }
                )
            }

            composable<BookingDetail> {
                BookingDetailScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToChat = { userId ->
                        navController.navigate(Chat(userId))
                    },
                    onNavigateToWorker = { workerId ->
                        navController.navigate(WorkerProfile(workerId))
                    },
                    onNavigateToReview = { bookingId ->
                        navController.navigate(ReviewSubmission(bookingId))
                    }
                )
            }

            // Chat
            composable<Chat> {
                ChatScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToWorker = { workerId ->
                        navController.navigate(WorkerProfile(workerId))
                    }
                )
            }

            // AI Features
            composable<AIAssistant> {
                AIChatScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable<SmartMatch> {
                SmartMatchScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToWorker = { workerId ->
                        navController.navigate(WorkerProfile(workerId))
                    }
                )
            }

            composable<SmartSchedule> {
                SmartScheduleScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onSelectSlot = { date, time ->
                        // Handle time slot selection - navigate back with result
                        navController.popBackStack()
                    }
                )
            }

            // Properties
            composable<Properties> {
                PropertiesScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToProperty = { propertyId ->
                        navController.navigate(PropertyDetail(propertyId))
                    },
                    onNavigateToAddProperty = {
                        navController.navigate(PropertyDetail("new"))
                    }
                )
            }

            composable<PropertyDetail> { backStackEntry ->
                val propertyId = backStackEntry.arguments?.getString("propertyId")
                PropertyDetailScreen(
                    propertyId = if (propertyId == "new") null else propertyId,
                    onNavigateBack = { navController.popBackStack() },
                    onSaveSuccess = { navController.popBackStack() }
                )
            }

            // Invoices
            composable<Invoices> {
                InvoicesScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onNavigateToInvoice = { /* Invoice detail */ }
                )
            }

            // Review Insights
            composable<ReviewInsights> {
                ReviewInsightsScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            // Review Submission
            composable<ReviewSubmission> {
                ReviewSubmissionScreen(
                    onNavigateBack = { navController.popBackStack() },
                    onReviewSubmitted = {
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}
