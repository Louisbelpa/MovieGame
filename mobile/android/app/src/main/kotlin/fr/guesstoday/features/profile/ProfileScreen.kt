package fr.guesstoday.features.profile

import android.content.Context
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.*
import androidx.compose.ui.layout.*
import androidx.compose.ui.platform.*
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import coil.request.ImageRequest
import fr.guesstoday.features.auth.AuthViewModel
import fr.guesstoday.features.auth.GButton
import fr.guesstoday.features.auth.GOutlinedButton
import fr.guesstoday.features.game.GameMode
import fr.guesstoday.navigation.Screen
import fr.guesstoday.ui.theme.AppColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    authViewModel: AuthViewModel,
    navController: NavController,
) {
    val state by authViewModel.uiState.collectAsState()
    var selectedMode by remember { mutableStateOf(GameMode.FILM) }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            TopAppBar(
                title = { Text("Profil", color = AppColors.text) },
                actions = {
                    if (state.user != null) {
                        IconButton(onClick = { authViewModel.logout() }) {
                            Icon(Icons.Default.Logout, contentDescription = "Déconnexion", tint = AppColors.textDim)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.background),
            )
        }
    ) { padding ->
        if (state.user == null) {
            GuestView(padding, navController)
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
            ) {
                // Avatar + info
                Column(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    UserAvatar(state.user?.avatarUrl, 72.dp)
                    Spacer(Modifier.height(12.dp))
                    Text(state.user?.displayName ?: "", color = AppColors.text, fontSize = 22.sp, fontFamily = FontFamily.Serif, fontWeight = FontWeight.SemiBold)
                    state.user?.email?.let { Text(it, color = AppColors.textDim, fontSize = 13.sp) }
                    if (state.user?.emailVerified == false) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = AppColors.amber, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Email non vérifié", color = AppColors.amber, fontSize = 12.sp)
                        }
                    }
                }

                // Mode tabs
                TabRow(
                    selectedTabIndex = listOf(GameMode.FILM, GameMode.WIKI).indexOf(selectedMode),
                    containerColor   = AppColors.surface,
                    contentColor     = AppColors.gold,
                    indicator        = { tabPositions ->
                        val index = listOf(GameMode.FILM, GameMode.WIKI).indexOf(selectedMode)
                        TabRowDefaults.SecondaryIndicator(Modifier.tabIndicatorOffset(tabPositions[index]), color = AppColors.gold)
                    }
                ) {
                    listOf(GameMode.FILM to "Films", GameMode.WIKI to "Wiki").forEach { (mode, label) ->
                        Tab(
                            selected  = selectedMode == mode,
                            onClick   = { selectedMode = mode },
                            text      = { Text(label, color = if (selectedMode == mode) AppColors.gold else AppColors.textDim) }
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))

                // Stats
                StatsPanel(selectedMode, Modifier.padding(horizontal = 16.dp))

                Spacer(Modifier.height(16.dp))

                // Actions
                Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    GOutlinedButton("Amis & Classement") { navController.navigate(Screen.Friends.route) }
                }

                Spacer(Modifier.height(32.dp))
            }
        }
    }
}

@Composable
private fun GuestView(padding: PaddingValues, navController: NavController) {
    Column(
        modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Default.PersonOff, contentDescription = null, tint = AppColors.muted, modifier = Modifier.size(64.dp))
        Spacer(Modifier.height(16.dp))
        Text("Pas encore connecté", color = AppColors.text, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        Text("Créez un compte pour sauvegarder vos stats.", color = AppColors.textDim, fontSize = 14.sp)
        Spacer(Modifier.height(20.dp))
        GButton("Se connecter / Créer un compte") { navController.navigate("login") }
    }
}

@Composable
fun UserAvatar(url: String?, size: Dp) {
    val ctx = LocalContext.current
    if (url != null) {
        AsyncImage(
            model   = ImageRequest.Builder(ctx).data(url).crossfade(true).build(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(size).clip(CircleShape)
                .border(1.dp, AppColors.border, CircleShape)
        )
    } else {
        Box(
            modifier = Modifier.size(size).clip(CircleShape)
                .background(AppColors.surfaceAlt)
                .border(1.dp, AppColors.border, CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(Icons.Default.Person, contentDescription = null, tint = AppColors.muted,
                modifier = Modifier.size(size * 0.5f))
        }
    }
}

@Composable
private fun StatsPanel(mode: GameMode, modifier: Modifier = Modifier) {
    val ctx = LocalContext.current
    val prefs = ctx.getSharedPreferences("game_stats", Context.MODE_PRIVATE)
    val key = mode.statsKey

    val played = prefs.getInt("${key}_played", 0)
    val wins   = prefs.getInt("${key}_wins", 0)
    val streak = prefs.getInt("${key}_streak", 0)
    val max    = prefs.getInt("${key}_max_streak", 0)
    val winRate = if (played > 0) wins.toFloat() / played else 0f

    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Summary card
        Surface(modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), color = AppColors.surface, border = BorderStroke(1.dp, AppColors.border)) {
            Row(Modifier.fillMaxWidth().padding(12.dp)) {
                listOf("Joués" to "$played", "Victoires" to "$wins", "Série" to "$streak", "Max" to "$max").forEachIndexed { i, (label, value) ->
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(value, color = AppColors.gold, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                        Text(label, color = AppColors.textDim, fontSize = 11.sp)
                    }
                    if (i < 3) VerticalDivider(Modifier.height(36.dp), color = AppColors.border)
                }
            }
        }

        // Win rate bar
        if (played > 0) {
            Surface(modifier.fillMaxWidth(), shape = RoundedCornerShape(10.dp), color = AppColors.surface, border = BorderStroke(1.dp, AppColors.border)) {
                Column(Modifier.padding(12.dp)) {
                    Row(Modifier.fillMaxWidth()) {
                        Text("Taux de victoire", color = AppColors.textDim, fontSize = 13.sp, modifier = Modifier.weight(1f))
                        Text("${(winRate * 100).toInt()}%", color = AppColors.gold, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { winRate },
                        modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                        color    = AppColors.gold,
                        trackColor = AppColors.surfaceAlt,
                    )
                }
            }
        }
    }
}
