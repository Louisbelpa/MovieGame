package fr.guesstoday.features.archive

import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.*
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import fr.guesstoday.data.api.ApiService
import fr.guesstoday.features.game.GameMode
import fr.guesstoday.ui.theme.AppColors
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

data class ArchiveUiState(
    val filmDates: List<String>  = emptyList(),
    val wikiDates: List<String>  = emptyList(),
    val selectedMode: GameMode   = GameMode.FILM,
    val isLoading: Boolean       = false,
)

@HiltViewModel
class ArchiveViewModel @Inject constructor(
    private val api: ApiService,
    @ApplicationContext private val ctx: Context,
) : ViewModel() {
    private val _state = MutableStateFlow(ArchiveUiState())
    val state = _state.asStateFlow()

    init { load() }

    fun setMode(mode: GameMode) { _state.update { it.copy(selectedMode = mode) } }

    fun outcome(date: String, mode: GameMode): String? {
        val prefs = ctx.getSharedPreferences("game_history_${mode.statsKey}", Context.MODE_PRIVATE)
        return prefs.getString(date, null)
    }

    fun recordOutcome(date: String, mode: GameMode, outcome: String) {
        ctx.getSharedPreferences("game_history_${mode.statsKey}", Context.MODE_PRIVATE)
            .edit().putString(date, outcome).apply()
    }

    private fun load() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val filmD = async { runCatching { api.challengeDates(365, "film").dates }.getOrDefault(emptyList()) }
            val wikiD = async { runCatching { api.wikiDates(365).dates }.getOrDefault(emptyList()) }
            _state.update { it.copy(filmDates = filmD.await(), wikiDates = wikiD.await(), isLoading = false) }
        }
    }

    fun datesByMonth(dates: List<String>): List<Pair<String, List<String>>> {
        val sorted = dates.sortedDescending()
        val fmt    = SimpleDateFormat("yyyy-MM-dd", Locale.FRANCE)
        val mFmt   = SimpleDateFormat("MMMM yyyy", Locale.FRANCE)
        val groups = mutableListOf<Pair<String, MutableList<String>>>()
        for (date in sorted) {
            val d = fmt.parse(date) ?: continue
            val month = mFmt.format(d).replaceFirstChar { it.uppercase() }
            val group = groups.lastOrNull()?.takeIf { it.first == month }
                ?: (month to mutableListOf<String>()).also { groups.add(it) }
            group.second.add(date)
        }
        return groups
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ArchiveScreen(
    navController: NavController,
    vm: ArchiveViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    val dates = if (state.selectedMode == GameMode.WIKI) state.wikiDates else state.filmDates
    val groups = remember(dates) { vm.datesByMonth(dates) }

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            TopAppBar(
                title = { Text("Archive", color = AppColors.text) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.background),
            )
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            // Mode tabs
            TabRow(
                selectedTabIndex = listOf(GameMode.FILM, GameMode.WIKI).indexOf(state.selectedMode),
                containerColor   = AppColors.surface,
                contentColor     = AppColors.gold,
                indicator        = { tabPositions ->
                    val idx = listOf(GameMode.FILM, GameMode.WIKI).indexOf(state.selectedMode)
                    TabRowDefaults.SecondaryIndicator(Modifier.tabIndicatorOffset(tabPositions[idx]), color = AppColors.gold)
                }
            ) {
                listOf(GameMode.FILM to "Films", GameMode.WIKI to "Wiki").forEach { (mode, label) ->
                    Tab(
                        selected = state.selectedMode == mode,
                        onClick  = { vm.setMode(mode) },
                        text     = { Text(label, color = if (state.selectedMode == mode) AppColors.gold else AppColors.textDim) }
                    )
                }
            }

            when {
                state.isLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = AppColors.gold) }
                groups.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text("Aucun défi disponible", color = AppColors.textDim) }
                else -> {
                    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        groups.forEach { (month, monthDates) ->
                            item {
                                Text(month, color = AppColors.textDim, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp, modifier = Modifier.padding(vertical = 8.dp))
                            }
                            items(monthDates) { date ->
                                ArchiveDateRow(
                                    date    = date,
                                    outcome = vm.outcome(date, state.selectedMode),
                                    onClick = {
                                        // Navigate to game with this date — for simplicity, just note it
                                        // In a full implementation, navigate to a detail screen
                                    }
                                )
                                Spacer(Modifier.height(4.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ArchiveDateRow(date: String, outcome: String?, onClick: () -> Unit) {
    val dotColor = when (outcome) {
        "won"  -> AppColors.green
        "lost" -> AppColors.red
        else   -> AppColors.muted.copy(alpha = 0.4f)
    }
    Surface(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(8.dp),
        color    = AppColors.surface.copy(alpha = 0.5f),
        border   = BorderStroke(1.dp, AppColors.border.copy(alpha = 0.3f)),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(Modifier.size(10.dp).clip(CircleShape).background(dotColor))
            Text(formatDate(date), color = AppColors.text, fontSize = 14.sp, modifier = Modifier.weight(1f))
            if (outcome != null) {
                Text(if (outcome == "won") "✓" else "✗",
                    color = if (outcome == "won") AppColors.green else AppColors.red,
                    fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }
            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = AppColors.muted, modifier = Modifier.size(16.dp))
        }
    }
}

private fun formatDate(date: String): String = try {
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.FRANCE)
    val d = sdf.parse(date) ?: return date
    SimpleDateFormat("EEEE d MMMM", Locale.FRANCE).format(d).replaceFirstChar { it.uppercase() }
} catch (e: Exception) { date }
