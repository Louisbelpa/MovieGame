package fr.guesstoday.features.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import dagger.hilt.android.lifecycle.HiltViewModel
import fr.guesstoday.data.api.*
import fr.guesstoday.data.prefs.SessionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val user: User?               = null,
    val isCheckingSession: Boolean= true,
    val isLoading: Boolean        = false,
    val error: String?            = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val api: ApiService,
    private val sessionManager: SessionManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    val isLoggedIn: Boolean get() = _uiState.value.user != null

    init {
        checkSession()
    }

    private fun checkSession() {
        viewModelScope.launch {
            runCatching { api.me().user }
                .onSuccess { user -> _uiState.update { it.copy(user = user, isCheckingSession = false) } }
                .onFailure { _uiState.update { it.copy(isCheckingSession = false) } }
        }
    }

    fun login(email: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { api.login(LoginBody(email, password)) }
                .onSuccess { r ->
                    sessionManager.sessionToken = r.sessionToken
                    _uiState.update { it.copy(user = r.user, isLoading = false) }
                    onSuccess()
                }
                .onFailure { e -> _uiState.update { it.copy(isLoading = false, error = e.message) } }
        }
    }

    fun register(email: String, password: String, displayName: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching { api.register(RegisterBody(email, password, displayName)) }
                .onSuccess { r ->
                    sessionManager.sessionToken = r.sessionToken
                    _uiState.update { it.copy(user = r.user, isLoading = false) }
                    onSuccess()
                }
                .onFailure { e -> _uiState.update { it.copy(isLoading = false, error = e.message) } }
        }
    }

    fun logout() {
        viewModelScope.launch {
            runCatching { api.logout() }
            sessionManager.clear()
            _uiState.update { it.copy(user = null) }
        }
    }

    fun loginWithGoogle(account: GoogleSignInAccount, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            runCatching {
                api.oauthCallback(
                    OAuthCallbackBody(
                        provider    = "google",
                        providerId  = account.id ?: error("No Google ID"),
                        email       = account.email ?: "",
                        displayName = account.displayName ?: account.email?.substringBefore('@') ?: "User",
                        avatarUrl   = account.photoUrl?.toString(),
                    )
                )
            }.onSuccess { res ->
                sessionManager.sessionToken = res.sessionToken
                _uiState.update { it.copy(user = res.user, isLoading = false) }
                onSuccess()
            }.onFailure { e ->
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun clearError() { _uiState.update { it.copy(error = null) } }
}
