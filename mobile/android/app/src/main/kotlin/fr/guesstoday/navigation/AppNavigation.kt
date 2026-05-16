package fr.guesstoday.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.*
import fr.guesstoday.features.archive.ArchiveScreen
import fr.guesstoday.features.auth.AuthViewModel
import fr.guesstoday.features.auth.ForgotPasswordScreen
import fr.guesstoday.features.auth.LoginScreen
import fr.guesstoday.features.auth.RegisterScreen
import fr.guesstoday.features.friends.FriendsScreen
import fr.guesstoday.features.game.GameMode
import fr.guesstoday.features.game.GameScreen
import fr.guesstoday.features.profile.ProfileScreen
import fr.guesstoday.ui.theme.AppColors

sealed class Screen(val route: String) {
    object Film    : Screen("film")
    object Wiki    : Screen("wiki")
    object Archive : Screen("archive")
    object Profile : Screen("profile")
    object Friends : Screen("friends")
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.uiState.collectAsState()

    if (authState.isCheckingSession) {
        SplashScreen()
        return
    }

    Scaffold(
        containerColor = AppColors.background,
        bottomBar = {
            NavigationBar(containerColor = AppColors.surface) {
                val currentDest = navController.currentBackStackEntryAsState().value?.destination
                listOf(
                    Triple(Screen.Film,    Icons.Default.Movie,         "Films"),
                    Triple(Screen.Wiki,    Icons.Default.PersonOutline,  "Wiki"),
                    Triple(Screen.Archive, Icons.Default.CalendarMonth,  "Archive"),
                    Triple(Screen.Profile, Icons.Default.Person,         "Profil"),
                ).forEach { (screen, icon, label) ->
                    NavigationBarItem(
                        selected = currentDest?.hierarchy?.any { it.route == screen.route } == true,
                        onClick = {
                            navController.navigate(screen.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor   = AppColors.gold,
                            selectedTextColor   = AppColors.gold,
                            unselectedIconColor = AppColors.textDim,
                            unselectedTextColor = AppColors.textDim,
                            indicatorColor      = AppColors.gold.copy(alpha = 0.12f),
                        )
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController   = navController,
            startDestination = Screen.Film.route,
            modifier        = Modifier.padding(padding)
        ) {
            composable(Screen.Film.route) {
                GameScreen(mode = GameMode.FILM, navController = navController)
            }
            composable(Screen.Wiki.route) {
                GameScreen(mode = GameMode.WIKI, navController = navController)
            }
            composable(Screen.Archive.route) {
                ArchiveScreen(navController = navController)
            }
            composable(Screen.Profile.route) {
                ProfileScreen(
                    authViewModel = authViewModel,
                    navController = navController,
                )
            }
            composable(Screen.Friends.route) {
                FriendsScreen(navController = navController)
            }
            composable("login") {
                LoginScreen(navController = navController, authViewModel = authViewModel)
            }
            composable("register") {
                RegisterScreen(navController = navController, authViewModel = authViewModel)
            }
            composable("forgotPassword") {
                ForgotPasswordScreen(navController = navController)
            }
        }
    }
}

@Composable
private fun SplashScreen() {
    androidx.compose.foundation.layout.Box(
        modifier = androidx.compose.ui.Modifier
            .fillMaxSize()
            .background(AppColors.background),
        contentAlignment = androidx.compose.ui.Alignment.Center
    ) {
        androidx.compose.foundation.layout.Column(
            horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text  = "GT",
                style = MaterialTheme.typography.displayLarge,
                color = AppColors.gold,
            )
            CircularProgressIndicator(color = AppColors.gold)
        }
    }
}

private val androidx.compose.foundation.layout.BoxScope.fillMaxSize
    get() = androidx.compose.ui.Modifier.fillMaxSize()

private val Int.dp get() = androidx.compose.ui.unit.Dp(this.toFloat())
