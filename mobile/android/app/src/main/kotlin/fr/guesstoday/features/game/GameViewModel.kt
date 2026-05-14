package fr.guesstoday.features.game

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import fr.guesstoday.data.api.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import javax.inject.Inject

enum class GameMode(val apiType: String, val label: String, val statsKey: String) {
    FILM("film",   "Films",      "film"),
    SERIES("series", "Séries",   "series"),
    WIKI("wiki",   "WikiGuessr", "wiki"),
}

data class GameUiState(
    val challenge: ChallengePayload?     = null,
    val filmResult: ChallengeResult?     = null,
    val wikiResult: WikiResult?          = null,
    val isLoading: Boolean               = false,
    val error: String?                   = null,
    val inputText: String                = "",
    val searchResults: List<SearchResultItem> = emptyList(),
    val isSearching: Boolean             = false,
    val previousHintsRevealed: Int       = 0,
    val showWin: Boolean                 = false,
    val showLose: Boolean                = false,
    val viewingDate: String?             = null,
    val shake: Int                       = 0,
)

@HiltViewModel
class GameViewModel @Inject constructor(
    private val api: ApiService,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val _uiState = MutableStateFlow(GameUiState())
    val uiState: StateFlow<GameUiState> = _uiState.asStateFlow()

    private var searchJob: Job? = null
    private var currentMode: GameMode = GameMode.FILM

    fun init(mode: GameMode) {
        currentMode = mode
        loadToday()
    }

    fun loadToday() {
        _uiState.update { it.copy(viewingDate = null) }
        fetchChallenge(null)
    }

    fun loadDate(date: String) {
        _uiState.update { it.copy(viewingDate = date) }
        fetchChallenge(date)
    }

    private fun fetchChallenge(date: String?) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, filmResult = null, wikiResult = null, inputText = "", searchResults = emptyList(), previousHintsRevealed = 0) }

            runCatching {
                if (date != null) {
                    if (currentMode == GameMode.WIKI) api.wikiChallengeForDate(date)
                    else api.challengeForDate(date, currentMode.apiType)
                } else {
                    if (currentMode == GameMode.WIKI) api.todayWikiChallenge()
                    else api.todayChallenge(currentMode.apiType)
                }
            }.onSuccess { payload ->
                _uiState.update { it.copy(challenge = payload, isLoading = false) }
                if (payload.isGameOver) {
                    fetchResult(payload.challengeId)
                    if (payload.won) _uiState.update { it.copy(showWin = true) }
                    else if (payload.lost) _uiState.update { it.copy(showLose = true) }
                }
            }.onFailure { e ->
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun submitGuess(guess: String) {
        val c = _uiState.value.challenge ?: return
        if (c.isGameOver || guess.isEmpty()) return

        viewModelScope.launch {
            _uiState.update { it.copy(inputText = "", searchResults = emptyList(), previousHintsRevealed = c.hintsRevealed) }

            runCatching {
                if (currentMode == GameMode.WIKI) api.submitWikiGuess(GuessBody(c.challengeId, guess))
                else api.submitGuess(GuessBody(c.challengeId, guess))
            }.onSuccess { response ->
                _uiState.update { it.copy(challenge = response.payload) }
                if (response.correct) {
                    fetchResult(response.payload.challengeId)
                    _uiState.update { it.copy(showWin = true) }
                    recordStats(won = true, attemptsUsed = response.payload.attemptsUsed)
                } else {
                    _uiState.update { it.copy(shake = it.shake + 1) }
                    if (response.payload.isGameOver) {
                        fetchResult(response.payload.challengeId)
                        _uiState.update { it.copy(showLose = true) }
                        recordStats(won = false, attemptsUsed = response.payload.attemptsUsed)
                    }
                }
            }.onFailure { e ->
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }

    fun skipAttempt() = submitGuess("")

    fun onInputChange(text: String) {
        _uiState.update { it.copy(inputText = text) }
        searchJob?.cancel()

        if (text.length < 2) {
            _uiState.update { it.copy(searchResults = emptyList()) }
            return
        }

        searchJob = viewModelScope.launch {
            delay(250)
            _uiState.update { it.copy(isSearching = true) }
            runCatching {
                if (currentMode == GameMode.WIKI) api.searchWikiPersons(text)
                else if (currentMode == GameMode.SERIES) api.searchSeries(text)
                else api.searchFilms(text)
            }.onSuccess { response ->
                _uiState.update { it.copy(searchResults = response.results, isSearching = false) }
            }.onFailure {
                _uiState.update { it.copy(isSearching = false) }
            }
        }
    }

    fun selectSearchResult(item: SearchResultItem) {
        _uiState.update { it.copy(inputText = item.title, searchResults = emptyList()) }
    }

    fun dismissWin()  { _uiState.update { it.copy(showWin = false) } }
    fun dismissLose() { _uiState.update { it.copy(showLose = false) } }

    fun navigatePrev() {
        val c = _uiState.value.challenge ?: return
        if (!c.hasPrevChallenge) return
        viewModelScope.launch {
            runCatching {
                val typeParam = if (currentMode == GameMode.WIKI) "wiki" else currentMode.apiType
                api.adjacentDate(c.date, "prev", typeParam)
            }.onSuccess { r -> r.date?.let { loadDate(it) } }
        }
    }

    fun navigateNext() {
        val c = _uiState.value.challenge ?: return
        if (!c.hasNextChallenge || !c.isPastChallenge) return
        viewModelScope.launch {
            runCatching {
                val typeParam = if (currentMode == GameMode.WIKI) "wiki" else currentMode.apiType
                api.adjacentDate(c.date, "next", typeParam)
            }.onSuccess { r -> r.date?.let { loadDate(it) } }
        }
    }

    fun returnToToday() = loadToday()

    private fun fetchResult(challengeId: Int) {
        viewModelScope.launch {
            runCatching {
                if (currentMode == GameMode.WIKI) _uiState.update { it.copy(wikiResult = api.wikiResult(challengeId)) }
                else _uiState.update { it.copy(filmResult = api.challengeResult(challengeId)) }
            }
        }
    }

    fun buildShareText(): String {
        val c = _uiState.value.challenge ?: return ""
        val title = if (currentMode == GameMode.WIKI) "WikiGuessr" else "GuessToday"
        val emoji = if (c.won) "🎉" else "💀"
        val attempts = if (c.won) "${c.attemptsUsed}/${c.maxAttempts}" else "X/${c.maxAttempts}"
        val grid = c.attempts.joinToString("") { a ->
            when { a.correct -> "🟢"; a.guess.isEmpty() -> "⬜"; else -> "🔴" }
        }
        return "$title $emoji $attempts\n$grid\nhttps://guesstoday.fr"
    }

    private fun recordStats(won: Boolean, attemptsUsed: Int) {
        val prefs = context.getSharedPreferences("game_stats", Context.MODE_PRIVATE)
        val key = currentMode.statsKey
        var played = prefs.getInt("${key}_played", 0)
        var wins   = prefs.getInt("${key}_wins", 0)
        var streak = prefs.getInt("${key}_streak", 0)
        var max    = prefs.getInt("${key}_max_streak", 0)
        played++
        if (won) { wins++; streak++; if (streak > max) max = streak }
        else streak = 0
        prefs.edit()
            .putInt("${key}_played", played)
            .putInt("${key}_wins", wins)
            .putInt("${key}_streak", streak)
            .putInt("${key}_max_streak", max)
            .apply()
        if (won) {
            val distKey = "${key}_dist_$attemptsUsed"
            prefs.edit().putInt(distKey, prefs.getInt(distKey, 0) + 1).apply()
        }
    }
}
