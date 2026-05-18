package fr.guesstoday.features.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.text.font.*
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.*
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import dagger.hilt.android.lifecycle.HiltViewModel
import fr.guesstoday.data.api.ApiService
import fr.guesstoday.data.api.EmailBody
import fr.guesstoday.ui.theme.AppColors
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// MARK: - ViewModel

data class ForgotPasswordUiState(
    val email: String      = "",
    val isLoading: Boolean = false,
    val success: Boolean   = false,
    val error: String?     = null,
)

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val api: ApiService,
) : ViewModel() {

    private val _state = MutableStateFlow(ForgotPasswordUiState())
    val state: StateFlow<ForgotPasswordUiState> = _state.asStateFlow()

    fun onEmailChange(v: String) { _state.update { it.copy(email = v, error = null) } }

    fun submit() {
        val email = _state.value.email.trim().lowercase()
        if (email.isBlank()) return
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            runCatching { api.forgotPassword(EmailBody(email)) }
                .onSuccess { _state.update { it.copy(isLoading = false, success = true) } }
                .onFailure { e -> _state.update { it.copy(isLoading = false, error = e.message) } }
        }
    }
}

// MARK: - Screen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ForgotPasswordScreen(
    navController: NavController,
    vm: ForgotPasswordViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()

    Scaffold(
        containerColor = AppColors.background,
        topBar = {
            TopAppBar(
                title = { Text("Mot de passe oublié", color = AppColors.text) },
                navigationIcon = {
                    TextButton(onClick = { navController.popBackStack() }) {
                        Text("Retour", color = AppColors.textDim)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppColors.background),
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Spacer(Modifier.height(16.dp))

            Text(
                "Entrez votre adresse email. Si un compte existe, vous recevrez un lien pour réinitialiser votre mot de passe.",
                color    = AppColors.textDim,
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )

            if (state.success) {
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape    = RoundedCornerShape(10.dp),
                    color    = AppColors.green.copy(alpha = 0.10f),
                    border   = androidx.compose.foundation.BorderStroke(1.dp, AppColors.green.copy(alpha = 0.35f)),
                ) {
                    Text(
                        "Si votre email est enregistré, vous recevrez les instructions sous peu.",
                        color    = AppColors.green,
                        fontSize = 14.sp,
                        lineHeight = 20.sp,
                        modifier = Modifier.padding(12.dp),
                    )
                }
            } else {
                GTextField(
                    label       = "Email",
                    value       = state.email,
                    onChange    = { vm.onEmailChange(it) },
                    keyboardType = KeyboardType.Email,
                    imeAction   = ImeAction.Done,
                )

                state.error?.let {
                    Text(it, color = AppColors.red, fontSize = 13.sp)
                }

                GButton(
                    text      = "Envoyer le lien",
                    isLoading = state.isLoading,
                    enabled   = state.email.isNotBlank(),
                    onClick   = { vm.submit() },
                )
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}
